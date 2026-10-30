import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  type Relation,
} from 'typeorm';
import { SoftDeleteEntity } from '../../../infrastructure/database/entites/soft-delete.entity.js';
import { User } from '../../users/entities/users.entity.js';
import { Conversation } from './conversation.entity.js';
import { MessageAttachment } from './message-attachment.entity.js';
import { MessageMention } from './message-mention.entity.js';
import { MessageReaction } from './message-reaction.entity.js';

/** TEXT: người dùng gửi; SYSTEM: sự kiện tự sinh (thêm thành viên, task thay đổi...) */
export const MESSAGE_TYPES = ['TEXT', 'SYSTEM'] as const;
export type MessageType = (typeof MESSAGE_TYPES)[number];

@Entity('messages')
@Check('CHK_messages_type', `"type" IN ('TEXT', 'SYSTEM')`)
// Phân trang theo cursor: WHERE conversation_id = ? AND id < ? ORDER BY id DESC
@Index('IDX_messages_conversation', ['conversationId', 'id'])
@Index('IDX_messages_parent', ['parentId'], { where: '"parent_id" IS NOT NULL' })
// Client gửi lại (mất mạng, retry) không tạo tin trùng
@Index(
  'UQ_messages_client_message',
  ['conversationId', 'authorId', 'clientMessageId'],
  { unique: true, where: '"client_message_id" IS NOT NULL' },
)
export class Message extends SoftDeleteEntity {
  @Column({ name: 'conversation_id', type: 'int' })
  conversationId: number;

  @ManyToOne(() => Conversation, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'conversation_id',
    foreignKeyConstraintName: 'FK_messages_conversation',
  })
  conversation: Relation<Conversation>;

  // Null với tin SYSTEM, hoặc khi tài khoản tác giả bị xoá
  @Column({ name: 'author_id', type: 'int', nullable: true })
  authorId: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'author_id',
    foreignKeyConstraintName: 'FK_messages_author',
  })
  author: Relation<User> | null;

  // Trả lời trong thread, một cấp như TaskComment
  @Column({ name: 'parent_id', type: 'int', nullable: true })
  parentId: number | null;

  @ManyToOne(() => Message, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'parent_id',
    foreignKeyConstraintName: 'FK_messages_parent',
  })
  parent: Relation<Message> | null;

  @Column({ type: 'varchar', length: 20, default: 'TEXT' })
  type: MessageType;

  @Column({
    name: 'content_type',
    type: 'varchar',
    length: 255,
    default: 'markdown',
  })
  contentType: string;

  // Có thể rỗng khi tin chỉ gồm file đính kèm
  @Column({ type: 'text', default: '' })
  content: string;

  // Dữ liệu cho tin SYSTEM, vd { event: 'task.created', taskId }
  @Column({ type: 'jsonb', nullable: true })
  data: Record<string, unknown> | null;

  @Column({ name: 'client_message_id', type: 'uuid', nullable: true })
  clientMessageId: string | null;

  // Non-null when the message body has been edited at least once.
  @Column({ name: 'edited_at', type: 'timestamptz', nullable: true })
  editedAt: Date | null;

  @OneToMany(() => MessageAttachment, (attachment) => attachment.message)
  attachments: Relation<MessageAttachment>[];

  @OneToMany(() => MessageMention, (mention) => mention.message)
  mentions: Relation<MessageMention>[];

  @OneToMany(() => MessageReaction, (reaction) => reaction.message)
  reactions: Relation<MessageReaction>[];
}
