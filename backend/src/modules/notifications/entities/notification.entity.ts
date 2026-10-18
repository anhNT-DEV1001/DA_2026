import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  type Relation,
} from 'typeorm';
import { BaseEntity } from '../../../infrastructure/database/entites/base.entity.js';
import { User } from '../../users/entities/users.entity.js';
import { Workspace } from '../../workspaces/entities/workspace.entity.js';
import { NotificationRecipient } from './notification-recipient.entity.js';

@Entity('notifications')
@Index(['entityType', 'entityId'])
export class Notification extends BaseEntity {
  @Column({ type: 'varchar', length: 255, nullable: false })
  type: string;

  // Người gây ra sự kiện (null nếu do hệ thống/cron)
  @Column({ name: 'actor_id', type: 'int', nullable: true })
  actorId: number | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'actor_id' })
  actor: Relation<User>;

  @Column({ name: 'workspace_id', type: 'int', nullable: true })
  workspaceId: number | null;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id' })
  workspace: Relation<Workspace>;

  @Column({ name: 'entity_type', type: 'varchar', length: 50, nullable: true })
  entityType: string | null;

  @Column({ name: 'entity_id', type: 'int', nullable: true })
  entityId: number | null;

  @Column({ type: 'varchar', length: 255, nullable: false })
  title: string;

  @Column({ type: 'text', nullable: true })
  content: string | null;

  // Snapshot dữ liệu để FE render/điều hướng (taskTitle, oldStatus, newStatus, url...)
  @Column({ type: 'jsonb', nullable: true })
  data: Record<string, unknown> | null;

  @OneToMany(() => NotificationRecipient, (recipient) => recipient.notification)
  recipients: Relation<NotificationRecipient[]>;
}
