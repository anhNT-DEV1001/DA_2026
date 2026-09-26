import { BaseEntity } from '../../../infrastructure/database/entites/index.js';
import { UserRole } from '../../users/entities/user-role.entity.js';
import { Column, Entity, OneToMany, type Relation } from 'typeorm';
import { RolePermission } from './role-permission.entity.js';

@Entity('roles')
export class Role extends BaseEntity {
  @Column({ type: 'varchar', length: 255, unique: true })
  name: string;
  @Column({ type: 'text', nullable: true })
  description: string | null;

  @OneToMany(() => UserRole, (userRole) => userRole.role)
  userRoles: Relation<UserRole>[];

  @OneToMany(() => RolePermission, (rolePermission) => rolePermission.role)
  rolePermissions: Relation<RolePermission>[];
}
