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
import { User } from '../../users/entities/users.entity.js';

export const NOTE_COLORS = [
  'yellow',
  'pink',
  'green',
  'blue',
  'purple',
  'orange',
  'gray',
] as const;

export type NoteColor = (typeof NOTE_COLORS)[number];

@Entity('notes')
@Check(
  'CHK_notes_color',
  `"color" IN ('yellow', 'pink', 'green', 'blue', 'purple', 'orange', 'gray')`,
)
@Index('IDX_notes_user', ['userId', 'id'], { where: '"deleted_at" IS NULL' })
export class Note extends SoftDeleteEntity {
  // Chủ sở hữu ghi chú (ghi chú cá nhân, chỉ chủ sở hữu mới xem/sửa được)
  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id', foreignKeyConstraintName: 'FK_notes_user' })
  user: Relation<User>;

  // Nội dung HTML từ trình soạn thảo (bold, italic, checklist...)
  @Column({ type: 'text', default: '' })
  content: string;

  // Nội dung dạng text thuần (bỏ định dạng) dùng để tìm kiếm / xem trước
  @Column({ name: 'content_text', type: 'text', default: '' })
  contentText: string;

  @Column({ type: 'varchar', length: 20, default: 'yellow' })
  color: NoteColor;
}
