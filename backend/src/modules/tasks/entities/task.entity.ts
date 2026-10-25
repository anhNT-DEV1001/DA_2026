import { SoftDeleteEntity } from '../../../infrastructure/database/entites/soft-delete.entity.js';
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
import { Workspace } from '../../workspaces/entities/workspace.entity.js';
import { Space } from '../../workspaces/entities/space.entity.js';
import { TaskStatus } from './task-status.entity.js';
import { TaskAssigned } from './task-assigned.entity.js';

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
@Index('IDX_tasks_space_status', ['spaceId', 'statusId'], {
  where: '"deleted_at" IS NULL',
})
@Index('IDX_tasks_space', ['spaceId'], { where: '"deleted_at" IS NULL' })
export class Task extends SoftDeleteEntity {
  @Column({ name: 'workspace_id', type: 'int' })
  workspaceId: number;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'workspace_id',
    foreignKeyConstraintName: 'FK_tasks_workspace',
  })
  workspace: Relation<Workspace>;

  @Column({ name: 'space_id', type: 'int', nullable: true })
  spaceId: number | null;

  @ManyToOne(() => Space, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'space_id',
    foreignKeyConstraintName: 'FK_tasks_space',
  })
  space: Relation<Space> | null;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'status_id', type: 'int' })
  statusId: number;

  // Composite FK ensures the status belongs to the same space as the task.
  @ManyToOne(() => TaskStatus, { onDelete: 'NO ACTION' })
  @JoinColumn([
    {
      name: 'space_id',
      referencedColumnName: 'spaceId',
      foreignKeyConstraintName: 'FK_tasks_space_status',
    },
    {
      name: 'status_id',
      referencedColumnName: 'id',
      foreignKeyConstraintName: 'FK_tasks_space_status',
    },
  ])
  status: Relation<TaskStatus>;

  @OneToMany(() => TaskAssigned, (ta) => ta.task)
  assignees: Relation<TaskAssigned>[];

  @Column({ type: 'varchar', length: 255 })
  priority: string;

  // Date-only strings prevent timezone conversion from shifting planned dates.
  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate: string | null;

  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate: string | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;
}
