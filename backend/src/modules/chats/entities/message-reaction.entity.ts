import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  Unique,
  type Relation,
} from 'typeorm';
import { BaseEntity } from '../../../infrastructure/database/entites/base.entity.js';
import { User } from '../../users/entities/users.entity.js';
import { Message } from './message.entity.js';

@Entity('message_reactions')
// Mỗi người thả mỗi emoji một lần; index này cũng phục vụ truy vấn theo message_id
@Unique('UQ_message_reactions_message_user_emoji', ['messageId', 'userId', 'emoji'])
export class MessageReaction extends BaseEntity {
  @Column({ name: 'message_id', type: 'int' })
  messageId: number;

  @ManyToOne(() => Message, (message) => message.reactions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'message_id',
    foreignKeyConstraintName: 'FK_message_reactions_message',
  })
  message: Relation<Message>;

  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'user_id',
    foreignKeyConstraintName: 'FK_message_reactions_user',
  })
  user: Relation<User>;

  @Column({ type: 'varchar', length: 32 })
  emoji: string;
}
