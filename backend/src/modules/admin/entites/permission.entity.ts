import { BaseEntity } from '../../../infrastructure/database/entites/index.js';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  type Relation,
} from 'typeorm';
import { Menu } from './menu.entity.js';
import { RolePermission } from './role-permission.entity.js';
import { UserPermission } from '../../users/entities/user-permission.entity.js';

@Entity('permissions')
export class Permission extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255 })
  action: string;

  @Column({ name: 'menu_id', type: 'int' })
  menuId: number;

  @ManyToOne(() => Menu, (menu) => menu.permissions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'menu_id' })
  menu: Relation<Menu>;

  @Column({ type: 'varchar', length: 255, unique: true })
  code: string;

  @OneToMany(
    () => RolePermission,
    (rolePermission) => rolePermission.permission,
  )
  rolePermissions: Relation<RolePermission>[];

  @OneToMany(
    () => UserPermission,
    (userPermission) => userPermission.permission,
  )
  userPermissions: Relation<UserPermission>[];
}
