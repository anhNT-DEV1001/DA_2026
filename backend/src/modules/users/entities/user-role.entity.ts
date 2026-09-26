import { BaseEntity } from '../../../infrastructure/database/entites/index.js';
import { Column, Entity, JoinColumn, ManyToOne, type Relation } from 'typeorm';
import { Role } from '../../admin/entites/role.entity.js';
import { User } from './users.entity.js';

@Entity('user_roles')
export class UserRole extends BaseEntity {
  @Column({ name: 'role_id', type: 'int' })
  roleId: number;

  @ManyToOne(() => Role, (role) => role.userRoles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'role_id' })
  role: Relation<Role>;

  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @ManyToOne(() => User, (user) => user.userRoles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: Relation<User>;
}
