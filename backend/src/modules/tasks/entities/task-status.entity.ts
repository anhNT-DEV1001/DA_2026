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
import { Space } from '../../workspaces/entities/space.entity.js';

@Entity('task_statuses')
@Unique('UQ_task_statuses_space_code', ['spaceId', 'code'])
@Unique('UQ_task_statuses_space_id', ['spaceId', 'id'])
@Check('CHK_task_statuses_name', `length(btrim("name")) > 0`)
@Check('CHK_task_statuses_order', '"display_order" >= 0')
export class TaskStatus extends BaseEntity {
  @Column({ name: 'space_id', type: 'int' })
  spaceId: number;

  @ManyToOne(() => Space, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'space_id',
    foreignKeyConstraintName: 'FK_task_statuses_space',
  })
  space: Relation<Space>;

  @Column({ type: 'varchar', length: 50 })
  code: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ name: 'display_order', type: 'int', default: 0 })
  displayOrder: number;

  @Column({ name: 'is_completed', type: 'boolean', default: false })
  isCompleted: boolean;
}
