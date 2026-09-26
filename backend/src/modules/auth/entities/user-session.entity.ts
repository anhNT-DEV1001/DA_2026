import { BaseEntity } from '../../../infrastructure/database/entites/index.js';
import { User } from '../../users/entities/users.entity.js';
import { Column, Entity, JoinColumn, ManyToOne, type Relation } from 'typeorm';

@Entity('user_sessions')
export class UserSession extends BaseEntity {
  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @ManyToOne(() => User, (user) => user.sessions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: Relation<User>;

  @Column({ type: 'varchar', length: 255, name: 'hashed_token' })
  hashedToken: string;
  // Giữ kiểu `date` khi TypeORM synchronize đang bật. Việc đổi trực tiếp sang
  // timestamp khiến TypeORM tạo lại cột NOT NULL và làm mất dữ liệu hiện có.
  // Chỉ đổi kiểu này bằng migration có câu lệnh ALTER COLUMN ... USING.
  @Column({ type: 'date', name: 'expires_at' })
  expiresAt: Date;
  @Column({ type: 'uuid' })
  sid: string;
}
