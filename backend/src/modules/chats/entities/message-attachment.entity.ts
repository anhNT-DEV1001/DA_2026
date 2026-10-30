import { Column, Entity, Index, JoinColumn, ManyToOne, type Relation } from 'typeorm';
import { BaseEntity } from '../../../infrastructure/database/entites/base.entity.js';
import { Conversation } from './conversation.entity.js';
import { Message } from './message.entity.js';

/**
 * Upload trước, gắn vào tin khi gửi: message_id null nghĩa là chưa gửi
 * (dọn định kỳ nếu bỏ dở). conversation_id dùng để kiểm tra quyền lúc upload/tải.
 */
@Entity('message_attachments')
@Index('IDX_message_attachments_message', ['messageId'])
@Index('IDX_message_attachments_pending', ['createdAt'], {
  where: '"message_id" IS NULL',
})
export class MessageAttachment extends BaseEntity {
  @Column({ name: 'conversation_id', type: 'int' })
  conversationId: number;

  @ManyToOne(() => Conversation, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'conversation_id',
    foreignKeyConstraintName: 'FK_message_attachments_conversation',
  })
  conversation: Relation<Conversation>;

  @Column({ name: 'message_id', type: 'int', nullable: true })
  messageId: number | null;

  @ManyToOne(() => Message, (message) => message.attachments, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'message_id',
    foreignKeyConstraintName: 'FK_message_attachments_message',
  })
  message: Relation<Message> | null;

  @Column({ name: 'original_name', type: 'varchar', length: 255 })
  originalName: string;

  // Đường dẫn tương đối trong ./uploads, vd 'chat-files/abc.png'
  @Column({ name: 'file_path', type: 'varchar', length: 500 })
  filePath: string;

  @Column({ name: 'mime_type', type: 'varchar', length: 255 })
  mimeType: string;

  @Column({ type: 'int' })
  size: number;
}
