import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { Task } from './task.entity.js';
import { User } from '../../users/entities/users.entity.js';

@Entity('task_activities')
@Index('IDX_task_activities_task', ['taskId', 'id'])
export class TaskActivity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'task_id', type: 'int' })
  taskId: number;

  @ManyToOne(() => Task, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'task_id',
    foreignKeyConstraintName: 'FK_task_activities_task',
  })
  task: Relation<Task>;

  @Column({ name: 'actor_id', type: 'int', nullable: true })
  actorId: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'actor_id',
    foreignKeyConstraintName: 'FK_task_activities_actor',
  })
  actor: Relation<User> | null;

  @Column({ type: 'varchar', length: 20 })
  action: 'created' | 'updated' | 'deleted';

  @Column({ type: 'jsonb', nullable: true })
  before: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  after: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
