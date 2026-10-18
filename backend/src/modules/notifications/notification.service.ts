import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, IsNull, Repository } from 'typeorm';
import { Notification, NotificationRecipient } from './entities/index.js';
import { WorkspaceMember } from '../workspaces/entities/index.js';
import { User } from '../users/entities/users.entity.js';
import { CreateNotificationDto, NotificationRequest } from './dtos/index.js';
import { WebsocketService } from '../../infrastructure/websockets/websocket.service.js';
import {
  PageMetadataResponse,
  PageResponse,
} from '../../common/responses/index.js';

export const NOTIFICATION_CHANNEL = 'notification';

export interface NotificationItem {
  id: number;
  type: string;
  title: string;
  content: string | null;
  actorId: number | null;
  workspaceId: number | null;
  entityType: string | null;
  entityId: number | null;
  data: Record<string, unknown> | null;
  createdAt: Date | null;
  actor: Pick<User, 'id' | 'fullName' | 'username' | 'avatar'> | null;
  readAt: Date | null;
  seenAt: Date | null;
}

@Injectable()
export class NotificationService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(NotificationRecipient)
    private readonly recipientRepo: Repository<NotificationRecipient>,
    @InjectRepository(WorkspaceMember)
    private readonly workmemRepo: Repository<WorkspaceMember>,
    private readonly websocketService: WebsocketService,
  ) {}

  /**
   * Tạo thông báo và gán cho danh sách người nhận.
   * - Có truyền userIds: gửi đúng cho các user đó.
   * - Không truyền userIds: gửi cho toàn bộ thành viên đã tham gia (MS001) của workspace (nếu có workspaceId).
   * Người gây ra sự kiện (actor) luôn bị loại khỏi danh sách nhận.
   */
  async create(
    dto: CreateNotificationDto,
    userIds?: number[],
  ): Promise<Notification | null> {
    const recipientIds = await this.resolveRecipientIds(dto, userIds);
    // Không có ai nhận thì không cần tạo thông báo
    if (recipientIds.length === 0) return null;

    const notification = await this.dataSource.transaction(async (manager) => {
      const saved = await manager.save(
        manager.create(Notification, {
          type: dto.type,
          title: dto.title,
          content: dto.content ?? null,
          actorId: dto.actorId ?? null,
          workspaceId: dto.workspaceId ?? null,
          entityType: dto.entityType ?? null,
          entityId: dto.entityId ?? null,
          data: dto.data ?? null,
        }),
      );

      await manager.insert(
        NotificationRecipient,
        recipientIds.map((userId) => ({ notificationId: saved.id, userId })),
      );

      return saved;
    });

    // Đẩy realtime sau khi transaction đã commit
    for (const userId of recipientIds) {
      this.websocketService.toUser(
        userId,
        NOTIFICATION_CHANNEL,
        'created',
        notification,
      );
    }

    return notification;
  }

  /**
   * Danh sách thông báo của user (mới nhất trước), kèm trạng thái đọc/xem và người gây ra sự kiện.
   */
  async findForUser(
    userId: number,
    query: NotificationRequest,
  ): Promise<PageResponse<NotificationItem>> {
    const qb = this.recipientRepo
      .createQueryBuilder('r')
      .innerJoinAndSelect('r.notification', 'n')
      .leftJoin('n.actor', 'actor')
      .addSelect([
        'actor.id',
        'actor.fullName',
        'actor.username',
        'actor.avatar',
      ])
      .where('r.userId = :userId', { userId })
      .andWhere('r.deletedAt IS NULL')
      .orderBy('n.id', 'DESC')
      .skip(query.skip)
      .take(query.limit ?? 15);

    if (query.unreadOnly) {
      qb.andWhere('r.readAt IS NULL');
    }

    const [rows, itemCount] = await qb.getManyAndCount();
    const items = rows.map(
      ({ notification: n, readAt, seenAt }): NotificationItem => ({
        id: n.id,
        type: n.type,
        title: n.title,
        content: n.content,
        actorId: n.actorId,
        workspaceId: n.workspaceId,
        entityType: n.entityType,
        entityId: n.entityId,
        data: n.data,
        createdAt: n.createdAt,
        actor: n.actor ?? null,
        readAt,
        seenAt,
      }),
    );
    const meta = new PageMetadataResponse({ pageRequest: query, itemCount });
    return new PageResponse(items, meta);
  }

  /** Số thông báo chưa đọc và chưa xem (dùng cho badge) */
  async countForUser(
    userId: number,
  ): Promise<{ unreadCount: number; unseenCount: number }> {
    const base = { userId, deletedAt: IsNull() };
    const [unreadCount, unseenCount] = await Promise.all([
      this.recipientRepo.count({ where: { ...base, readAt: IsNull() } }),
      this.recipientRepo.count({ where: { ...base, seenAt: IsNull() } }),
    ]);
    return { unreadCount, unseenCount };
  }

  /** Đánh dấu đã xem tất cả (khi mở danh sách thông báo) */
  async markAllSeen(userId: number) {
    await this.recipientRepo.update(
      { userId, seenAt: IsNull(), deletedAt: IsNull() },
      { seenAt: new Date() },
    );
    this.syncToUser(userId, 'seen', { all: true });
    return { ok: true };
  }

  async markAllRead(userId: number) {
    const now = new Date();
    await this.recipientRepo.update(
      { userId, readAt: IsNull(), deletedAt: IsNull() },
      { readAt: now },
    );
    // Đã đọc thì cũng coi như đã xem
    await this.recipientRepo.update(
      { userId, seenAt: IsNull(), deletedAt: IsNull() },
      { seenAt: now },
    );
    this.syncToUser(userId, 'read', { all: true });
    return { ok: true };
  }

  async markRead(userId: number, notificationId: number) {
    const recipient = await this.findRecipient(userId, notificationId);
    if (!recipient.readAt) {
      const now = new Date();
      recipient.readAt = now;
      recipient.seenAt ??= now;
      await this.recipientRepo.save(recipient);
      this.syncToUser(userId, 'read', { ids: [notificationId] });
    }
    return { ok: true };
  }

  /** Ẩn toàn bộ thông báo của user */
  async removeAll(userId: number) {
    await this.recipientRepo.update(
      { userId, deletedAt: IsNull() },
      { deletedAt: new Date() },
    );
    this.syncToUser(userId, 'deleted', { all: true });
    return { ok: true };
  }

  async remove(userId: number, notificationId: number) {
    const recipient = await this.findRecipient(userId, notificationId);
    recipient.deletedAt = new Date();
    await this.recipientRepo.save(recipient);
    this.syncToUser(userId, 'deleted', { ids: [notificationId] });
    return { ok: true };
  }

  private async findRecipient(userId: number, notificationId: number) {
    const recipient = await this.recipientRepo.findOne({
      where: { userId, notificationId, deletedAt: IsNull() },
    });
    if (!recipient) {
      throw new NotFoundException('Không tìm thấy thông báo.');
    }
    return recipient;
  }

  /** Đồng bộ trạng thái sang các tab/thiết bị khác của cùng user */
  private syncToUser(userId: number, event: string, data: unknown) {
    this.websocketService.toUser(userId, NOTIFICATION_CHANNEL, event, data);
  }

  private async resolveRecipientIds(
    dto: CreateNotificationDto,
    userIds?: number[],
  ): Promise<number[]> {
    let ids: number[];

    if (userIds !== undefined) {
      ids = userIds;
    } else if (dto.workspaceId) {
      const members = await this.workmemRepo.find({
        select: { userId: true },
        where: {
          workspaceId: dto.workspaceId,
          status: In(['MS001', 'active']),
        },
      });
      ids = members.map((m) => m.userId);
    } else {
      ids = [];
    }

    // Loại trùng và loại actor
    return [...new Set(ids)].filter((id) => id !== dto.actorId);
  }
}
