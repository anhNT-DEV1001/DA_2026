import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  DataSource,
  EntityManager,
  In,
  IsNull,
  SelectQueryBuilder,
} from 'typeorm';
import {
  Conversation,
  Message,
  MessageAttachment,
  MessageMention,
  MessageReaction,
} from '../entities/index.js';
import { User } from '../../users/entities/users.entity.js';
import { NotificationService } from '../../notifications/notification.service.js';
import {
  PageMetadataResponse,
  PageResponse,
} from '../../../common/responses/paginate.response.js';
import {
  ChatPageQuery,
  MessageCursorQuery,
  SendMessageDto,
  UpdateMessageDto,
} from '../dtos/index.js';
import { isBlankContent, preview, uniqueIds } from '../utils/content.util.js';
import { ChatAccessService } from './chat-access.service.js';
import { ChatRealtimeService } from './chat-realtime.service.js';
import {
  ConversationService,
  USER_SUMMARY_SELECT,
  UserSummary,
} from './conversation.service.js';

export interface ReactionSummary {
  emoji: string;
  count: number;
  userIds: number[];
}

@Injectable()
export class MessageService {
  private readonly logger = new Logger(MessageService.name);

  constructor(
    private readonly source: DataSource,
    private readonly chatAccess: ChatAccessService,
    private readonly conversations: ConversationService,
    private readonly realtime: ChatRealtimeService,
    private readonly notifications: NotificationService,
  ) {}

  /* ---------------------------------- Đọc ---------------------------------- */

  /** Reaction đã gom theo emoji, theo thứ tự thả đầu tiên */
  async reactionSummary(
    messageIds: number[],
    manager: EntityManager = this.source.manager,
  ) {
    const result = new Map<number, ReactionSummary[]>();
    if (!messageIds.length) return result;
    const rows = await manager.getRepository(MessageReaction).find({
      select: { messageId: true, userId: true, emoji: true },
      where: { messageId: In(messageIds) },
      order: { id: 'ASC' },
    });
    for (const row of rows) {
      const list = result.get(row.messageId) ?? [];
      let item = list.find((r) => r.emoji === row.emoji);
      if (!item) list.push((item = { emoji: row.emoji, count: 0, userIds: [] }));
      item.count++;
      item.userIds.push(row.userId);
      result.set(row.messageId, list);
    }
    return result;
  }

  /** Gắn tác giả, file, mention, reaction và số trả lời cho danh sách tin */
  async hydrate(
    messages: Message[],
    manager: EntityManager = this.source.manager,
  ) {
    if (!messages.length) return [];
    const ids = messages.map((m) => m.id);
    const authorIds = uniqueIds(
      messages.flatMap((m) => (m.authorId ? [m.authorId] : [])),
    );
    const [authors, attachments, mentions, reactions, replies] =
      await Promise.all([
        authorIds.length
          ? manager.getRepository(User).find({
              select: USER_SUMMARY_SELECT,
              where: { id: In(authorIds) },
            })
          : [],
        manager.getRepository(MessageAttachment).find({
          select: {
            id: true,
            messageId: true,
            originalName: true,
            mimeType: true,
            size: true,
          },
          where: { messageId: In(ids) },
          order: { id: 'ASC' },
        }),
        manager.getRepository(MessageMention).find({
          select: { messageId: true, userId: true },
          where: { messageId: In(ids) },
        }),
        this.reactionSummary(ids, manager),
        manager
          .getRepository(Message)
          .createQueryBuilder('r')
          .select('r.parentId', 'parentId')
          .addSelect('COUNT(*)::int', 'count')
          .addSelect('MAX(r.createdAt)', 'lastReplyAt')
          .where('r.parentId IN (:...ids)', { ids })
          .groupBy('r.parentId')
          .getRawMany<{ parentId: number; count: number; lastReplyAt: Date }>(),
      ]);
    const authorById = new Map<number, UserSummary>(authors.map((u) => [u.id, u]));
    const replyByParent = new Map(replies.map((r) => [Number(r.parentId), r]));

    return messages.map((m) => ({
      id: m.id,
      conversationId: m.conversationId,
      parentId: m.parentId,
      type: m.type,
      contentType: m.contentType,
      content: m.content,
      data: m.data,
      clientMessageId: m.clientMessageId,
      authorId: m.authorId,
      author: m.authorId ? (authorById.get(m.authorId) ?? null) : null,
      editedAt: m.editedAt,
      createdAt: m.createdAt,
      attachments: attachments
        .filter((a) => a.messageId === m.id)
        .map(({ id, originalName, mimeType, size }) => ({
          id,
          originalName,
          mimeType,
          size,
        })),
      mentionUserIds: mentions
        .filter((x) => x.messageId === m.id)
        .map((x) => x.userId),
      reactions: reactions.get(m.id) ?? [],
      replyCount: replyByParent.get(m.id)?.count ?? 0,
      lastReplyAt: replyByParent.get(m.id)?.lastReplyAt ?? null,
    }));
  }

  /**
   * `newestFirst`: thứ tự trả về (tin gốc: mới → cũ; trả lời trong thread: cũ → mới).
   * Cursor đi từ mốc ra xa: `before` lấy tin cũ hơn, `after` lấy tin mới hơn.
   */
  private async cursorPage(
    builder: SelectQueryBuilder<Message>,
    query: MessageCursorQuery,
    newestFirst: boolean,
  ) {
    const { before, after, limit } = query;
    if (before) builder.andWhere('m.id < :before', { before });
    if (after) builder.andWhere('m.id > :after', { after });
    const ascending = after !== undefined || (before === undefined && !newestFirst);
    const rows = await builder
      .orderBy('m.id', ascending ? 'ASC' : 'DESC')
      .limit(limit + 1)
      .getMany();
    const page = rows.slice(0, limit);
    if (ascending === newestFirst) page.reverse();
    return { items: await this.hydrate(page), hasMore: rows.length > limit };
  }

  async list(conversationId: number, userId: number, query: MessageCursorQuery) {
    await this.chatAccess.conversation(userId, conversationId);
    const builder = this.source
      .getRepository(Message)
      .createQueryBuilder('m')
      .where('m.conversationId = :conversationId', { conversationId })
      .andWhere('m.parentId IS NULL');
    if (query.search)
      builder.andWhere('m.content ILIKE :search', { search: `%${query.search}%` });
    return this.cursorPage(builder, query, true);
  }

  async replies(
    conversationId: number,
    parentId: number,
    userId: number,
    query: MessageCursorQuery,
  ) {
    await this.chatAccess.conversation(userId, conversationId);
    await this.rootMessage(this.source.manager, conversationId, parentId);
    const builder = this.source
      .getRepository(Message)
      .createQueryBuilder('m')
      .where('m.conversationId = :conversationId AND m.parentId = :parentId', {
        conversationId,
        parentId,
      });
    return this.cursorPage(builder, query, false);
  }

  /** Tin nhắc tới user trong các conversation user còn quyền vào, mới nhất trước */
  async mentions(workspaceId: number, userId: number, query: ChatPageQuery) {
    const conversationIds = await this.conversations.accessibleIds(
      workspaceId,
      userId,
    );
    if (!conversationIds.length)
      return new PageResponse(
        [],
        new PageMetadataResponse({ pageRequest: query, itemCount: 0 }),
      );
    const [messages, total] = await this.source
      .getRepository(Message)
      .createQueryBuilder('m')
      .innerJoin(MessageMention, 'mm', 'mm.messageId = m.id AND mm.userId = :userId', {
        userId,
      })
      .where('m.conversationId IN (:...conversationIds)', { conversationIds })
      .orderBy('m.id', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();
    return new PageResponse(
      await this.hydrate(messages),
      new PageMetadataResponse({ pageRequest: query, itemCount: total }),
    );
  }

  /* ---------------------------------- Ghi ---------------------------------- */

  private async rootMessage(
    manager: EntityManager,
    conversationId: number,
    messageId: number,
  ) {
    const parent = await manager
      .getRepository(Message)
      .findOne({ where: { id: messageId, conversationId } });
    if (!parent)
      throw new NotFoundException('Không tìm thấy tin nhắn trong cuộc trò chuyện');
    if (parent.parentId)
      throw new BadRequestException('Chỉ có thể trả lời tin nhắn gốc');
    return parent;
  }

  private async message(
    manager: EntityManager,
    conversationId: number,
    messageId: number,
  ) {
    const message = await manager.getRepository(Message).findOne({
      where: { id: messageId, conversationId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!message)
      throw new NotFoundException('Không tìm thấy tin nhắn trong cuộc trò chuyện');
    return message;
  }

  /** Chỉ giữ người còn quyền vào conversation, bỏ chính tác giả */
  private async allowedMentions(
    manager: EntityManager,
    conversation: Conversation,
    authorId: number,
    ids: number[] | undefined,
  ) {
    const wanted = uniqueIds(ids).filter((id) => id !== authorId);
    if (!wanted.length) return [];
    const members = new Set(await this.chatAccess.memberIds(conversation, manager));
    return wanted.filter((id) => members.has(id));
  }

  private async notifyMentions(
    conversation: Conversation,
    message: { id: number; content: string; author: UserSummary | null },
    actorId: number,
    userIds: number[],
  ) {
    if (!userIds.length) return;
    try {
      await this.notifications.create(
        {
          type: 'chat.mention',
          title: `${message.author?.fullName ?? 'Ai đó'} đã nhắc đến bạn`,
          content: preview(message.content),
          actorId,
          workspaceId: conversation.workspaceId,
          entityType: 'message',
          entityId: message.id,
          data: { conversationId: conversation.id, messageId: message.id },
        },
        userIds,
      );
    } catch (error) {
      // Tin đã lưu; lỗi thông báo không được làm hỏng việc gửi tin
      this.logger.warn(`Không gửi được thông báo mention: ${(error as Error).message}`);
    }
  }

  async send(
    conversationId: number,
    userId: number,
    dto: SendMessageDto,
    origin?: string,
  ) {
    const content = dto.content ?? '';
    const attachmentIds = uniqueIds(dto.attachmentIds);
    if (isBlankContent(content) && !attachmentIds.length)
      throw new BadRequestException('Tin nhắn không được để trống');

    const result = await this.source.transaction(async (manager) => {
      const { conversation } = await this.chatAccess.conversation(
        userId,
        conversationId,
        { manager, lock: true },
      );
      this.chatAccess.assertWritable(conversation);
      const repo = manager.getRepository(Message);

      if (dto.clientMessageId) {
        const existing = await repo.findOne({
          where: {
            conversationId,
            authorId: userId,
            clientMessageId: dto.clientMessageId,
          },
          withDeleted: true,
        });
        if (existing)
          return { conversation, message: existing, created: false, members: [], mentionIds: [] };
      }
      if (dto.parentId)
        await this.rootMessage(manager, conversationId, dto.parentId);

      const message = await repo.save(
        repo.create({
          conversationId,
          authorId: userId,
          parentId: dto.parentId ?? null,
          type: 'TEXT',
          contentType: dto.contentType ?? 'markdown',
          content,
          data: null,
          clientMessageId: dto.clientMessageId ?? null,
          editedAt: null,
          createdBy: userId,
          updatedBy: userId,
        }),
      );

      if (attachmentIds.length) {
        const { affected } = await manager.getRepository(MessageAttachment).update(
          {
            id: In(attachmentIds),
            conversationId,
            createdBy: userId,
            messageId: IsNull(),
          },
          { messageId: message.id, updatedBy: userId },
        );
        if (affected !== attachmentIds.length)
          throw new BadRequestException(
            'File đính kèm không hợp lệ hoặc đã được gửi trong tin khác',
          );
      }

      const mentionIds = await this.allowedMentions(
        manager,
        conversation,
        userId,
        dto.mentionUserIds,
      );
      if (mentionIds.length)
        await manager.getRepository(MessageMention).insert(
          mentionIds.map((id) => ({
            messageId: message.id,
            userId: id,
            createdBy: userId,
          })),
        );

      // Chỉ tiến: hai tin gửi gần như cùng lúc không làm lùi tin cuối
      await manager.query(
        `UPDATE "conversations" SET "last_message_id" = $2, "last_message_at" = $3
         WHERE "id" = $1 AND ("last_message_id" IS NULL OR "last_message_id" < $2)`,
        [conversationId, message.id, message.createdAt],
      );
      await this.conversations.advanceRead(manager, conversationId, userId, message.id);
      const members = await this.chatAccess.memberIds(conversation, manager);
      return { conversation, message, created: true, members, mentionIds };
    });

    const [view] = await this.hydrate([result.message]);
    if (!result.created) return view;

    this.realtime.emit(conversationId, 'message.created', view, origin);
    this.realtime.toUsers(
      result.members.filter((id) => id !== userId),
      'conversation.activity',
      {
        conversationId,
        workspaceId: result.conversation.workspaceId,
        messageId: view.id,
        parentId: view.parentId,
        authorId: userId,
        author: view.author,
        preview: preview(view.content),
        createdAt: view.createdAt,
      },
    );
    await this.notifyMentions(result.conversation, view, userId, result.mentionIds);
    return view;
  }

  async update(
    conversationId: number,
    messageId: number,
    userId: number,
    dto: UpdateMessageDto,
    origin?: string,
  ) {
    const result = await this.source.transaction(async (manager) => {
      const { conversation } = await this.chatAccess.conversation(
        userId,
        conversationId,
        { manager, lock: true },
      );
      this.chatAccess.assertWritable(conversation);
      const message = await this.message(manager, conversationId, messageId);
      if (message.authorId !== userId)
        throw new ForbiddenException('Bạn chỉ có thể sửa tin nhắn của mình');
      if (message.type !== 'TEXT')
        throw new BadRequestException('Không thể sửa tin nhắn hệ thống');
      if (isBlankContent(dto.content)) {
        const hasFiles = await manager
          .getRepository(MessageAttachment)
          .existsBy({ messageId });
        if (!hasFiles)
          throw new BadRequestException('Tin nhắn không được để trống');
      }

      let changed = false;
      if (message.content !== dto.content) {
        message.content = dto.content;
        message.editedAt = new Date();
        message.updatedBy = userId;
        await manager.getRepository(Message).save(message);
        changed = true;
      }

      let newMentions: number[] = [];
      if (dto.mentionUserIds !== undefined) {
        const mentionRepo = manager.getRepository(MessageMention);
        const before = (
          await mentionRepo.find({ select: { userId: true }, where: { messageId } })
        ).map((m) => m.userId);
        const after = await this.allowedMentions(
          manager,
          conversation,
          userId,
          dto.mentionUserIds,
        );
        const removed = before.filter((id) => !after.includes(id));
        newMentions = after.filter((id) => !before.includes(id));
        if (removed.length)
          await mentionRepo.delete({ messageId, userId: In(removed) });
        if (newMentions.length)
          await mentionRepo.insert(
            newMentions.map((id) => ({ messageId, userId: id, createdBy: userId })),
          );
        changed ||= removed.length > 0 || newMentions.length > 0;
      }
      return { conversation, message, changed, newMentions };
    });

    const [view] = await this.hydrate([result.message]);
    if (result.changed) {
      this.realtime.emit(conversationId, 'message.updated', view, origin);
      await this.notifyMentions(result.conversation, view, userId, result.newMentions);
    }
    return view;
  }

  /** Tác giả, hoặc owner workspace (kiểm duyệt), được xoá */
  async remove(
    conversationId: number,
    messageId: number,
    userId: number,
    origin?: string,
  ) {
    const message = await this.source.transaction(async (manager) => {
      const { conversation, isOwner } = await this.chatAccess.conversation(
        userId,
        conversationId,
        { manager, lock: true },
      );
      this.chatAccess.assertWritable(conversation);
      const message = await this.message(manager, conversationId, messageId);
      if (message.authorId !== userId && !isOwner)
        throw new ForbiddenException('Bạn chỉ có thể xóa tin nhắn của mình');
      message.deletedAt = new Date();
      message.deletedBy = userId;
      message.updatedBy = userId;
      await manager.getRepository(Message).save(message);

      if (conversation.lastMessageId === message.id) {
        const latest = await manager.getRepository(Message).findOne({
          select: { id: true, createdAt: true },
          where: { conversationId },
          order: { id: 'DESC' },
        });
        await manager.getRepository(Conversation).update(conversationId, {
          lastMessageId: latest?.id ?? null,
          lastMessageAt: latest?.createdAt ?? null,
        });
      }
      return message;
    });

    this.realtime.emit(
      conversationId,
      'message.deleted',
      { conversationId, messageId, parentId: message.parentId, actorId: userId },
      origin,
    );
    return { id: message.id, deletedAt: message.deletedAt };
  }
}
