import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  type Relation,
} from 'typeorm';
import { BaseEntity } from '../../../infrastructure/database/entites/base.entity.js';
import { User } from '../../users/entities/users.entity.js';
import { Notification } from './notification.entity.js';

@Entity('notification_recipients')
@Index(['notificationId', 'userId'], { unique: true })
@Index(['userId', 'readAt', 'id'])
export class NotificationRecipient extends BaseEntity {
  @Column({ name: 'notification_id', type: 'int', nullable: false })
  notificationId: number;

  @ManyToOne(() => Notification, (notification) => notification.recipients, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'notification_id' })
  notification: Relation<Notification>;

  @Column({ name: 'user_id', type: 'int', nullable: false })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: Relation<User>;

  // null = chưa đọc
  @Column({ name: 'read_at', type: 'timestamptz', nullable: true })
  readAt: Date | null;

  // Đã mở danh sách thông báo (dùng để reset badge)
  @Column({ name: 'seen_at', type: 'timestamptz', nullable: true })
  seenAt: Date | null;

  // User tự ẩn thông báo
  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
