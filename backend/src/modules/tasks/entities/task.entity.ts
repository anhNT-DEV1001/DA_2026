import { SoftDeleteEntity } from '../../../infrastructure/database/entites/soft-delete.entity.js';
import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  type Relation,
} from 'typeorm';
import { Workspace } from '../../workspaces/entities/workspace.entity.js';
import { User } from '../../users/entities/users.entity.js';
import { TaskStatus } from './task-status.entity.js';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

@Entity('tasks')
@Check('CHK_tasks_title', `length(btrim("title")) > 0`)
@Check(
  'CHK_tasks_priority',
  `"priority" IN ('low', 'medium', 'high', 'urgent')`,
)
@Check(
  'CHK_tasks_dates',
  `"start_date" IS NULL OR "due_date" IS NULL OR "start_date" <= "due_date"`,
)
@Index(
  'IDX_tasks_workspace_schedule',
  ['workspaceId', 'startDate', 'dueDate'],
  { where: '"deleted_at" IS NULL' },
)
@Index('IDX_tasks_workspace_status', ['workspaceId', 'statusId'], {
  where: '"deleted_at" IS NULL',
})
@Index('IDX_tasks_workspace_assignee', ['workspaceId', 'assigneeId'], {
  where: '"deleted_at" IS NULL',
})
export class Task extends SoftDeleteEntity {
  @Column({ name: 'workspace_id', type: 'int' })
  workspaceId: number;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'workspace_id',
    foreignKeyConstraintName: 'FK_tasks_workspace',
  })
  workspace: Relation<Workspace>;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'status_id', type: 'int' })
  statusId: number;

  // Composite FK keeps the status and task in the same workspace.
  @ManyToOne(() => TaskStatus, { onDelete: 'NO ACTION' })
  @JoinColumn([
    {
      name: 'workspace_id',
      referencedColumnName: 'workspaceId',
      foreignKeyConstraintName: 'FK_tasks_workspace_status',
    },
    {
      name: 'status_id',
      referencedColumnName: 'id',
      foreignKeyConstraintName: 'FK_tasks_workspace_status',
    },
  ])
  status: Relation<TaskStatus>;

  @Column({ name: 'assignee_id', type: 'int', nullable: true })
  assigneeId: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'assignee_id',
    foreignKeyConstraintName: 'FK_tasks_assignee',
  })
  assignee: Relation<User> | null;

  @Column({ type: 'varchar', length: 10, default: 'medium' })
  priority: TaskPriority;

  // Date-only strings prevent timezone conversion from shifting planned dates.
  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate: string | null;

  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate: string | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;
}
