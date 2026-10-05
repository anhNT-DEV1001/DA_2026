import { BaseEntity } from '../../../infrastructure/database/entites/index.js';
import { Column, Entity, JoinColumn, ManyToOne, type Relation } from 'typeorm';
import { User } from './users.entity.js';
import { Permission } from '../../admin/entites/permission.entity.js';

@Entity('user_permissions')
export class UserPermission extends BaseEntity {
  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @ManyToOne(() => User, (user) => user.userPermissions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: Relation<User>;

  @Column({ name: 'permission_id', type: 'int' })
  permissionId: number;

  @ManyToOne(() => Permission, (permission) => permission.userPermissions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'permission_id' })
  permission: Relation<Permission>;

  @Column({ name: 'revorke_at', type: 'timestamp', nullable: true })
  revorkeAt: Date | null;
}
