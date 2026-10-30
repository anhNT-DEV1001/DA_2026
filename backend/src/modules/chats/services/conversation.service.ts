import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager, In, QueryFailedError } from 'typeorm';
import { Conversation, ConversationParticipant, Message } from '../entities/index.js';
import { User } from '../../users/entities/users.entity.js';
import { Space } from '../../workspaces/entities/space.entity.js';
import { WorkspaceAccessService } from '../../workspaces/services/workspace-access.service.js';
import {
  MAX_DIRECT_MEMBERS,
  OpenDirectConversationDto,
  UpdateConversationPreferencesDto,
} from '../dtos/index.js';
import { preview } from '../utils/content.util.js';
import { ChatAccessService } from './chat-access.service.js';
import { ChatRealtimeService } from './chat-realtime.service.js';

export const WORKSPACE_CHANNEL_NAME = 'Kênh chung';

export type UserSummary = Pick<User, 'id' | 'fullName' | 'username' | 'avatar'>;

export const USER_SUMMARY_SELECT = {
  id: true,
  fullName: true,
  username: true,
  avatar: true,
} as const;

interface ConversationRow {
  id: number;
  workspace_id: number;
  type: Conversation['type'];
  name: string | null;
  space_id: number | null;
  space_name: string | null;
  space_icon: string | null;
  archived_at: Date | null;
  last_message_at: Date | null;
  muted: boolean;
  pinned: boolean;
  last_read_message_id: number | null;
  unread_count: number;
  last_id: number | null;
  last_type: Message['type'] | null;
  last_content: string | null;
  last_author_id: number | null;
  last_created_at: Date | null;
}

@Injectable()
export class ConversationService {
  constructor(
    private readonly source: DataSource,
    private readonly access: WorkspaceAccessService,
    private readonly chatAccess: ChatAccessService,
    private readonly realtime: ChatRealtimeService,
  ) {}

  /* ------------------------- Vòng đời workspace / space ------------------------- */

  /** Gọi trong transaction tạo workspace; gọi lại nhiều lần vẫn chỉ có một kênh chung */
  async createWorkspaceChannel(
    manager: EntityManager,
    workspaceId: number,
    actorId: number | null,
  ) {
    await manager.query(
      `INSERT INTO "conversations" ("workspace_id", "type", "name", "created_by", "updated_by")
       VALUES ($1, 'WORKSPACE', $2, $3, $3)
       ON CONFLICT ("workspace_id") WHERE "type" = 'WORKSPACE' AND "deleted_at" IS NULL DO NOTHING`,
      [workspaceId, WORKSPACE_CHANNEL_NAME, actorId],
    );
  }

  /** Gọi trong transaction tạo space; tên kênh lấy theo tên space nên không lưu */
  async createSpaceChannel(
    manager: EntityManager,
    space: Pick<Space, 'id' | 'workspaceId'>,
    actorId: number | null,
  ) {
    await manager.query(
      `INSERT INTO "conversations" ("workspace_id", "space_id", "type", "created_by", "updated_by")
       VALUES ($1, $2, 'SPACE', $3, $3)
       ON CONFLICT ("space_id") WHERE "type" = 'SPACE' AND "deleted_at" IS NULL DO NOTHING`,
      [space.workspaceId, space.id, actorId],
    );
  }

  /** Space bị xoá: kênh chuyển sang chỉ đọc */
  async archiveSpaceChannel(
    spaceId: number,
    actorId: number | null,
    manager: EntityManager = this.source.manager,
  ) {
    await manager.query(
      `UPDATE "conversations" SET "archived_at" = now(), "updated_by" = $2, "updated_at" = now()
       WHERE "space_id" = $1 AND "type" = 'SPACE' AND "archived_at" IS NULL`,
      [spaceId, actorId],
    );
  }

  /* ----------------------------------- Sidebar ---------------------------------- */

  /**
   * Conversation user xem được trong workspace (hoặc đúng một conversation đã kiểm tra quyền),
   * kèm tin cuối, số tin chưa đọc và tuỳ chọn riêng của user.
   */
  private rows(
    workspaceId: number,
    userId: number,
    spaceIds: number[] | null,
    conversationId?: number,
  ): Promise<ConversationRow[]> {
    return this.source.query(
      `SELECT c."id", c."workspace_id", c."type", c."name", c."space_id", c."archived_at", c."last_message_at",
              s."name" AS space_name, s."icon" AS space_icon,
              COALESCE(p."muted", false) AS muted, COALESCE(p."pinned", false) AS pinned,
              p."last_read_message_id",
              m."id" AS last_id, m."type" AS last_type, m."content" AS last_content,
              m."author_id" AS last_author_id, m."created_at" AS last_created_at,
              (SELECT count(*)::int FROM "messages" um
                WHERE um."conversation_id" = c."id" AND um."deleted_at" IS NULL
                  AND um."id" > COALESCE(p."last_read_message_id", 0)
                  AND um."author_id" IS DISTINCT FROM $2) AS unread_count
       FROM "conversations" c
       LEFT JOIN "spaces" s ON s."id" = c."space_id"
       LEFT JOIN "conversation_participants" p ON p."conversation_id" = c."id" AND p."user_id" = $2
       LEFT JOIN "messages" m ON m."id" = c."last_message_id" AND m."deleted_at" IS NULL
       WHERE c."workspace_id" = $1 AND c."deleted_at" IS NULL
         AND ($4::int IS NULL OR c."id" = $4)
         AND (c."type" = 'WORKSPACE'
           OR (c."type" = 'SPACE' AND s."deleted_at" IS NULL AND ($3::int[] IS NULL OR c."space_id" = ANY($3)))
           OR (c."type" = 'DIRECT' AND p."id" IS NOT NULL))
       ORDER BY pinned DESC, c."last_message_at" DESC NULLS LAST, c."id" ASC`,
      [workspaceId, userId, spaceIds, conversationId ?? null],
    );
  }

  private async present(rows: ConversationRow[]) {
    const directIds = rows.filter((r) => r.type === 'DIRECT').map((r) => r.id);
    const participants = directIds.length
      ? await this.source.getRepository(ConversationParticipant).find({
          select: { conversationId: true, userId: true },
          where: { conversationId: In(directIds) },
        })
      : [];
    const userIds = new Set([
      ...participants.map((p) => p.userId),
      ...rows.flatMap((r) => (r.last_author_id ? [r.last_author_id] : [])),
    ]);
    const users = userIds.size
      ? await this.source.getRepository(User).find({
          select: USER_SUMMARY_SELECT,
          where: { id: In([...userIds]) },
        })
      : [];
    const userById = new Map<number, UserSummary>(users.map((u) => [u.id, u]));

    return rows.map((row) => ({
      id: row.id,
      workspaceId: row.workspace_id,
      type: row.type,
      name: row.type === 'SPACE' ? row.space_name : row.name,
      spaceId: row.space_id,
      space: row.space_id
        ? { id: row.space_id, name: row.space_name, icon: row.space_icon }
        : null,
      archivedAt: row.archived_at,
      lastMessageAt: row.last_message_at,
      muted: row.muted,
      pinned: row.pinned,
      lastReadMessageId: row.last_read_message_id,
      unreadCount: row.unread_count,
      lastMessage: row.last_id
        ? {
            id: row.last_id,
            type: row.last_type,
            preview: preview(row.last_content ?? ''),
            authorId: row.last_author_id,
            author: row.last_author_id
              ? (userById.get(row.last_author_id) ?? null)
              : null,
            createdAt: row.last_created_at,
          }
        : null,
      participants: participants
        .filter((p) => p.conversationId === row.id)
        .flatMap((p) => userById.get(p.userId) ?? []),
    }));
  }

  async list(workspaceId: number, userId: number) {
    await this.access.assertWorkspaceMember(userId, workspaceId);
    const spaceIds = await this.access.accessibleSpaceIds(userId, workspaceId);
    return this.present(await this.rows(workspaceId, userId, spaceIds));
  }

  /** ID các conversation user xem được trong workspace */
  async accessibleIds(workspaceId: number, userId: number) {
    return (await this.list(workspaceId, userId)).map((c) => c.id);
  }

  async detail(conversationId: number, userId: number) {
    const { conversation } = await this.chatAccess.conversation(
      userId,
      conversationId,
    );
    const [item] = await this.present(
      await this.rows(conversation.workspaceId, userId, null, conversationId),
    );
    if (!item) throw new NotFoundException('Không tìm thấy cuộc trò chuyện');
    return item;
  }

  /** Thành viên có quyền vào conversation, dùng để gợi ý @mention */
  async members(conversationId: number, userId: number) {
    const { conversation } = await this.chatAccess.conversation(
      userId,
      conversationId,
    );
    const ids = await this.chatAccess.memberIds(conversation);
    if (!ids.length) return [];
    return this.source.getRepository(User).find({
      select: USER_SUMMARY_SELECT,
      where: { id: In(ids) },
      order: { fullName: 'ASC' },
    });
  }

  /* ------------------------------------ DM ------------------------------------ */

  /** Mở lại DM giữa đúng nhóm người này, chưa có thì tạo */
  async openDirect(
    workspaceId: number,
    userId: number,
    dto: OpenDirectConversationDto,
  ) {
    const ids = [...new Set([userId, ...dto.userIds])].sort((a, b) => a - b);
    if (ids.length < 2)
      throw new BadRequestException('Cần chọn ít nhất một người khác');
    if (ids.length > MAX_DIRECT_MEMBERS)
      throw new BadRequestException(
        `Cuộc trò chuyện riêng tối đa ${MAX_DIRECT_MEMBERS} người`,
      );
    await this.access.assertWorkspaceMember(userId, workspaceId);
    for (const id of ids.filter((id) => id !== userId))
      await this.access.assertWorkspaceMember(id, workspaceId, {
        label: `Người dùng #${id}`,
      });

    const directKey = ids.join(':');
    const repo = this.source.getRepository(Conversation);
    const existing = await repo.findOne({
      select: { id: true },
      where: { workspaceId, directKey },
    });
    if (existing) return this.detail(existing.id, userId);

    let created: Conversation;
    try {
      created = await this.source.transaction(async (manager) => {
        const conversation = await manager.getRepository(Conversation).save(
          manager.getRepository(Conversation).create({
            workspaceId,
            type: 'DIRECT',
            directKey,
            name: ids.length > 2 ? dto.name || null : null,
            createdBy: userId,
            updatedBy: userId,
          }),
        );
        await manager.getRepository(ConversationParticipant).insert(
          ids.map((id) => ({
            conversationId: conversation.id,
            userId: id,
            createdBy: userId,
            updatedBy: userId,
          })),
        );
        return conversation;
      });
    } catch (err) {
      // Hai người cùng mở DM một lúc: dùng conversation bên kia vừa tạo
      if (
        err instanceof QueryFailedError &&
        (err as any).constraint === 'UQ_conversations_direct_key'
      ) {
        const raced = await repo.findOneOrFail({ where: { workspaceId, directKey } });
        return this.detail(raced.id, userId);
      }
      throw err;
    }

    const item = await this.detail(created.id, userId);
    this.realtime.toUsers(
      ids.filter((id) => id !== userId),
      'conversation.created',
      { conversationId: created.id, workspaceId },
    );
    return item;
  }

  /* --------------------------- Trạng thái riêng của user --------------------------- */

  async updatePreferences(
    conversationId: number,
    userId: number,
    dto: UpdateConversationPreferencesDto,
  ) {
    await this.chatAccess.conversation(userId, conversationId);
    await this.source.query(
      `INSERT INTO "conversation_participants" ("conversation_id", "user_id", "muted", "pinned", "created_by", "updated_by")
       VALUES ($1, $2, COALESCE($3, false), COALESCE($4, false), $2, $2)
       ON CONFLICT ("conversation_id", "user_id") DO UPDATE SET
         "muted" = COALESCE($3, "conversation_participants"."muted"),
         "pinned" = COALESCE($4, "conversation_participants"."pinned"),
         "updated_by" = $2, "updated_at" = now()`,
      [conversationId, userId, dto.muted ?? null, dto.pinned ?? null],
    );
    return this.detail(conversationId, userId);
  }

  /** Dời mốc đã đọc lên `messageId`; chỉ tiến, không lùi (vd: tab cũ gửi mốc cũ) */
  async advanceRead(
    manager: EntityManager,
    conversationId: number,
    userId: number,
    messageId: number,
  ): Promise<number> {
    const [row] = await manager.query(
      `INSERT INTO "conversation_participants" ("conversation_id", "user_id", "last_read_message_id", "last_read_at", "created_by", "updated_by")
       VALUES ($1, $2, $3, now(), $2, $2)
       ON CONFLICT ("conversation_id", "user_id") DO UPDATE SET
         "last_read_message_id" = GREATEST(COALESCE("conversation_participants"."last_read_message_id", 0), EXCLUDED."last_read_message_id"),
         "last_read_at" = now(), "updated_at" = now()
       RETURNING "last_read_message_id"`,
      [conversationId, userId, messageId],
    );
    return Number(row.last_read_message_id);
  }

  async markRead(conversationId: number, userId: number, messageId?: number) {
    await this.chatAccess.conversation(userId, conversationId);
    const repo = this.source.getRepository(Message);
    const target = messageId
      ? await repo.findOne({
          select: { id: true },
          where: { id: messageId, conversationId },
          withDeleted: true,
        })
      : await repo.findOne({
          select: { id: true },
          where: { conversationId },
          order: { id: 'DESC' },
        });
    if (messageId && !target)
      throw new NotFoundException('Không tìm thấy tin nhắn trong cuộc trò chuyện');
    if (!target) return { conversationId, lastReadMessageId: null };

    const lastReadMessageId = await this.advanceRead(
      this.source.manager,
      conversationId,
      userId,
      target.id,
    );
    // Đồng bộ badge chưa đọc giữa các thiết bị của cùng user
    this.realtime.toUsers([userId], 'conversation.read', {
      conversationId,
      lastReadMessageId,
    });
    return { conversationId, lastReadMessageId };
  }
}
