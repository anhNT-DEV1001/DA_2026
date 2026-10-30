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
import { Message } from './message.entity.js';

/** Người được @nhắc trong tin: lọc "tin nhắc tôi" và gửi thông báo */
@Entity('message_mentions')
@Unique('UQ_message_mentions_message_user', ['messageId', 'userId'])
@Index('IDX_message_mentions_user', ['userId', 'messageId'])
export class MessageMention extends BaseEntity {
  @Column({ name: 'message_id', type: 'int' })
  messageId: number;

  @ManyToOne(() => Message, (message) => message.mentions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'message_id',
    foreignKeyConstraintName: 'FK_message_mentions_message',
  })
  message: Relation<Message>;

  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'user_id',
    foreignKeyConstraintName: 'FK_message_mentions_user',
  })
  user: Relation<User>;
}
