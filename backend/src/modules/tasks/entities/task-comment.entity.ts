import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  type Relation,
} from 'typeorm';
import { SoftDeleteEntity } from '../../../infrastructure/database/entites/soft-delete.entity.js';
import { Task } from './task.entity.js';
import { User } from '../../users/entities/users.entity.js';

@Entity('task_comments')
@Check('CHK_task_comments_content', `length(btrim("content")) > 0`)
@Index('IDX_task_comments_task', ['taskId', 'id'])
@Index('IDX_task_comments_parent', ['parentId'])
export class TaskComment extends SoftDeleteEntity {
  @Column({ name: 'task_id', type: 'int' })
  taskId: number;

  @ManyToOne(() => Task, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'task_id',
    foreignKeyConstraintName: 'FK_task_comments_task',
  })
  task: Relation<Task>;

  @Column({ name: 'author_id', type: 'int', nullable: true })
  authorId: number | null;

  // SET NULL so the comment body is preserved when the user is deleted.
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'author_id',
    foreignKeyConstraintName: 'FK_task_comments_author',
  })
  author: Relation<User> | null;

  @Column({ name: 'parent_id', type: 'int', nullable: true })
  parentId: number | null;

  // Replies nest one level deep; CASCADE so replies are removed with the parent.
  @ManyToOne(() => TaskComment, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'parent_id',
    foreignKeyConstraintName: 'FK_task_comments_parent',
  })
  parent: Relation<TaskComment> | null;

  @Column({
    name: 'content_type',
    type: 'varchar',
    length: 255,
    default: 'markdown',
  })
  contentType: string;

  @Column({ type: 'text' })
  content: string;

  // Non-null when the comment body has been edited at least once.
  @Column({ name: 'edited_at', type: 'timestamptz', nullable: true })
  editedAt: Date | null;
}
