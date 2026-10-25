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
import { Task } from './task.entity.js';
import { User } from '../../users/entities/users.entity.js';

@Entity('task_assigned')
@Unique('UQ_task_assigned_task_user', ['taskId', 'userId'])
@Index('IDX_task_assigned_task_id', ['taskId'])
@Index('IDX_task_assigned_user_id', ['userId'])
export class TaskAssigned extends BaseEntity {
  @Column({ name: 'task_id', type: 'int' })
  taskId: number;

  @ManyToOne(() => Task, (task) => task.assignees, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'task_id',
    foreignKeyConstraintName: 'FK_task_assigned_task',
  })
  task: Relation<Task>;

  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'user_id',
    foreignKeyConstraintName: 'FK_task_assigned_user',
  })
  user: Relation<User>;

  @Column({ name: 'assigned_by', type: 'int', nullable: true })
  assignedBy: number | null;

  // Who triggered the assignment (null = self-assigned or system)
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'assigned_by',
    foreignKeyConstraintName: 'FK_task_assigned_assigned_by',
  })
  assigner: Relation<User> | null;
}
