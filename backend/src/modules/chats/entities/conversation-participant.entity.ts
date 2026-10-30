import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  Unique,
  type Relation,
} from 'typeorm';
import { BaseEntity } from '../../../infrastructure/database/entites/base.entity.js';
import { User } from '../../users/entities/users.entity.js';
import { Conversation } from './conversation.entity.js';
import { Message } from './message.entity.js';

/**
 * Trạng thái riêng của từng user trong một conversation.
 * Với WORKSPACE/SPACE, quyền suy ra từ membership; dòng này tạo lazy khi user mở kênh.
 * Với DIRECT, dòng này đồng thời là danh sách người được vào.
 */
@Entity('conversation_participants')
@Unique('UQ_conversation_participants_conversation_user', [
  'conversationId',
  'userId',
])
@Index('IDX_conversation_participants_user', ['userId'])
export class ConversationParticipant extends BaseEntity {
  @Column({ name: 'conversation_id', type: 'int' })
  conversationId: number;

  @ManyToOne(() => Conversation, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'conversation_id',
    foreignKeyConstraintName: 'FK_conversation_participants_conversation',
  })
  conversation: Relation<Conversation>;

  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'user_id',
    foreignKeyConstraintName: 'FK_conversation_participants_user',
  })
  user: Relation<User>;

  // Số tin chưa đọc = tin có id lớn hơn mốc này
  @Column({ name: 'last_read_message_id', type: 'int', nullable: true })
  lastReadMessageId: number | null;

  @ManyToOne(() => Message, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'last_read_message_id',
    foreignKeyConstraintName: 'FK_conversation_participants_last_read',
  })
  lastReadMessage: Relation<Message> | null;

  @Column({ name: 'last_read_at', type: 'timestamptz', nullable: true })
  lastReadAt: Date | null;

  @Column({ type: 'boolean', default: false })
  muted: boolean;

  @Column({ type: 'boolean', default: false })
  pinned: boolean;
}
