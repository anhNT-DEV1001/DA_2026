import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { Conversation, ConversationParticipant } from '../entities/index.js';
import {
  ACTIVE_MEMBER_STATUSES,
  WorkspaceAccessService,
} from '../../workspaces/services/workspace-access.service.js';

export interface ChatAccessOptions {
  manager?: EntityManager;
  /** Giữ khoá đọc trên membership tới hết transaction */
  lock?: boolean;
}

/**
 * Quy tắc truy cập conversation, dùng chung cho HTTP và realtime:
 * - WORKSPACE: owner hoặc thành viên đang hoạt động của workspace.
 * - SPACE: owner workspace hoặc thành viên của space (giống quyền xem task).
 * - DIRECT: là participant và vẫn đang hoạt động trong workspace (owner cũng không đọc được DM của người khác).
 */
@Injectable()
export class ChatAccessService {
  constructor(
    private readonly source: DataSource,
    private readonly access: WorkspaceAccessService,
  ) {}

  async conversation(
    userId: number,
    conversationId: number,
    { manager = this.source.manager, lock = false }: ChatAccessOptions = {},
  ) {
    if (!Number.isSafeInteger(conversationId) || conversationId < 1)
      throw new BadRequestException('ID phải là số nguyên dương');
    const conversation = await manager
      .getRepository(Conversation)
      .findOne({ where: { id: conversationId } });
    if (!conversation)
      throw new NotFoundException('Không tìm thấy cuộc trò chuyện');

    const options = { manager, lock };
    const { isOwner } = await this.access.assertWorkspaceMember(
      userId,
      conversation.workspaceId,
      options,
    );
    if (conversation.type === 'SPACE') {
      await this.access.assertSpaceMember(
        userId,
        conversation.workspaceId,
        conversation.spaceId!,
        options,
      );
    } else if (conversation.type === 'DIRECT') {
      const joined = await manager
        .getRepository(ConversationParticipant)
        .existsBy({ conversationId, userId });
      if (!joined)
        throw new ForbiddenException('Bạn không tham gia cuộc trò chuyện này');
    }
    return { conversation, isOwner };
  }

  /** Dạng boolean của conversation(), dùng cho authorize của kênh realtime */
  async canAccess(userId: number, conversationId: number) {
    try {
      await this.conversation(userId, conversationId);
      return true;
    } catch {
      return false;
    }
  }

  assertWritable(conversation: Conversation) {
    if (conversation.archivedAt)
      throw new ForbiddenException(
        'Cuộc trò chuyện đã được lưu trữ, không thể gửi hoặc sửa tin nhắn',
      );
  }

  /** Các user đang có quyền vào conversation: để đẩy tin mới, lọc @mention, gợi ý thành viên */
  async memberIds(
    conversation: Conversation,
    manager: EntityManager = this.source.manager,
  ): Promise<number[]> {
    const params: unknown[] = [conversation.workspaceId, ACTIVE_MEMBER_STATUSES];
    let sql: string;
    if (conversation.type === 'WORKSPACE') {
      sql = `
        SELECT w."owner_id" AS id FROM "workspaces" w WHERE w."id" = $1
        UNION
        SELECT wm."user_id" FROM "workspace_members" wm
        WHERE wm."workspace_id" = $1 AND wm."status" = ANY($2)`;
    } else if (conversation.type === 'SPACE') {
      params.push(conversation.spaceId);
      sql = `
        SELECT w."owner_id" AS id FROM "workspaces" w WHERE w."id" = $1
        UNION
        SELECT wm."user_id" FROM "space-members" sm
        JOIN "workspace_members" wm ON wm."id" = sm."workspace_member_id"
        WHERE sm."space_id" = $3 AND wm."workspace_id" = $1 AND wm."status" = ANY($2)`;
    } else {
      params.push(conversation.id);
      sql = `
        SELECT p."user_id" AS id FROM "conversation_participants" p
        JOIN "workspaces" w ON w."id" = $1
        WHERE p."conversation_id" = $3
          AND (p."user_id" = w."owner_id" OR EXISTS (
            SELECT 1 FROM "workspace_members" wm
            WHERE wm."workspace_id" = $1 AND wm."user_id" = p."user_id" AND wm."status" = ANY($2)
          ))`;
    }
    const rows: { id: number }[] = await manager.query(sql, params);
    return rows.map((row) => Number(row.id));
  }
}
