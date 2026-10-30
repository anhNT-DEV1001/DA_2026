import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  type Relation,
} from 'typeorm';
import { SoftDeleteEntity } from '../../../infrastructure/database/entites/soft-delete.entity.js';
import { Workspace } from '../../workspaces/entities/workspace.entity.js';
import { Space } from '../../workspaces/entities/space.entity.js';
import { Message } from './message.entity.js';

/**
 * - WORKSPACE: kênh chung của workspace (vd #general), ai trong workspace cũng vào được.
 * - SPACE: kênh của dự án, quyền theo space-members; mỗi space đúng một kênh.
 * - DIRECT: chat riêng giữa các thành viên workspace, quyền theo conversation_participants.
 */
export const CONVERSATION_TYPES = ['WORKSPACE', 'SPACE', 'DIRECT'] as const;
export type ConversationType = (typeof CONVERSATION_TYPES)[number];

@Entity('conversations')
@Check(
  'CHK_conversations_type',
  `"type" IN ('WORKSPACE', 'SPACE', 'DIRECT')`,
)
// space_id chỉ có ở kênh SPACE, direct_key chỉ có ở DIRECT
@Check(
  'CHK_conversations_scope',
  `("type" = 'SPACE') = ("space_id" IS NOT NULL) AND ("type" = 'DIRECT') = ("direct_key" IS NOT NULL)`,
)
// Mỗi workspace một kênh chung
@Index('UQ_conversations_workspace_channel', ['workspaceId'], {
  unique: true,
  where: `"type" = 'WORKSPACE' AND "deleted_at" IS NULL`,
})
@Index('UQ_conversations_space', ['spaceId'], {
  unique: true,
  where: `"type" = 'SPACE' AND "deleted_at" IS NULL`,
})
@Index('UQ_conversations_direct_key', ['workspaceId', 'directKey'], {
  unique: true,
  where: `"direct_key" IS NOT NULL AND "deleted_at" IS NULL`,
})
// Sidebar: kênh có tin mới nhất lên đầu
@Index('IDX_conversations_workspace_activity', ['workspaceId', 'lastMessageAt'], {
  where: '"deleted_at" IS NULL',
})
export class Conversation extends SoftDeleteEntity {
  @Column({ name: 'workspace_id', type: 'int' })
  workspaceId: number;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'workspace_id',
    foreignKeyConstraintName: 'FK_conversations_workspace',
  })
  workspace: Relation<Workspace>;

  @Column({ name: 'space_id', type: 'int', nullable: true })
  spaceId: number | null;

  @ManyToOne(() => Space, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'space_id',
    foreignKeyConstraintName: 'FK_conversations_space',
  })
  space: Relation<Space> | null;

  @Column({ type: 'varchar', length: 20 })
  type: ConversationType;

  // Null với SPACE (lấy theo tên space) và DIRECT 1-1 (lấy theo tên người kia)
  @Column({ type: 'varchar', length: 255, nullable: true })
  name: string | null;

  // "minUserId:maxUserId..." đã sắp xếp, để tìm lại đúng DM giữa cùng nhóm người
  @Column({ name: 'direct_key', type: 'varchar', length: 255, nullable: true })
  directKey: string | null;

  @Column({ name: 'last_message_id', type: 'int', nullable: true })
  lastMessageId: number | null;

  @ManyToOne(() => Message, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'last_message_id',
    foreignKeyConstraintName: 'FK_conversations_last_message',
  })
  lastMessage: Relation<Message> | null;

  @Column({ name: 'last_message_at', type: 'timestamptz', nullable: true })
  lastMessageAt: Date | null;

  // Non-null: chỉ đọc (vd space bị xoá), không gửi thêm tin
  @Column({ name: 'archived_at', type: 'timestamptz', nullable: true })
  archivedAt: Date | null;
}
