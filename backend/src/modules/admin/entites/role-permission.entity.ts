import { BaseEntity } from '../../../infrastructure/database/entites/index.js';
import { Column, Entity, JoinColumn, ManyToOne, type Relation } from 'typeorm';
import { Role } from './role.entity.js';
import { Permission } from './permission.entity.js';

@Entity('role_permissions')
export class RolePermission extends BaseEntity {
  @Column({ name: 'role_id', type: 'int' })
  roleId: number;

  @ManyToOne(() => Role, (role) => role.rolePermissions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'role_id' })
  role: Relation<Role>;

  @Column({ name: 'permission_id', type: 'int' })
  permissionId: number;

  @ManyToOne(() => Permission, (permission) => permission.rolePermissions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'permission_id' })
  permission: Relation<Permission>;
}
