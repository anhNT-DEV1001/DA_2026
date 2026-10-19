import {
  Check,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  Unique,
  type Relation,
} from 'typeorm';
import { BaseEntity } from '../../../infrastructure/database/entites/base.entity.js';
import { Workspace } from '../../workspaces/entities/workspace.entity.js';

@Entity('task_statuses')
@Unique('UQ_task_statuses_workspace_code', ['workspaceId', 'code'])
@Unique('UQ_task_statuses_workspace_id', ['workspaceId', 'id'])
@Check('CHK_task_statuses_name', `length(btrim("name")) > 0`)
@Check('CHK_task_statuses_order', '"display_order" >= 0')
export class TaskStatus extends BaseEntity {
  @Column({ name: 'workspace_id', type: 'int' })
  workspaceId: number;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'workspace_id',
    foreignKeyConstraintName: 'FK_task_statuses_workspace',
  })
  workspace: Relation<Workspace>;

  @Column({ type: 'varchar', length: 50 })
  code: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ name: 'display_order', type: 'int', default: 0 })
  displayOrder: number;

  @Column({ name: 'is_completed', type: 'boolean', default: false })
  isCompleted: boolean;
}
