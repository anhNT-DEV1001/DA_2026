import { BaseEntity } from '../../../infrastructure/database/entites/index.js';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  type Relation,
} from 'typeorm';
import { Permission } from './permission.entity.js';

@Entity('menus')
export class Menu extends BaseEntity {
  @Column({ type: 'varchar', length: 255, nullable: false })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  route: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  icon: string | null;

  @Column({ type: 'varchar', length: 255, nullable: false, unique: true })
  alias: string;

  @Column({ name: 'parent_id', type: 'integer', nullable: true })
  parentId: number | null;

  @Column({ type: 'integer', default: 0 })
  displayOrder: number;

  @Column({ type: 'boolean', default: true })
  isSideBarDisplay: boolean;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  // 1. Phía Many trỏ về inverse side là 'parent'
  @OneToMany(() => Menu, (menu) => menu.parent)
  children: Relation<Menu>[];

  // 2. Phía One trỏ về 'children' và cấu hình JoinColumn map vào 'parentId'
  @ManyToOne(() => Menu, (menu) => menu.children, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parent_id' })
  parent: Relation<Menu> | null;

  @OneToMany(() => Permission, (permission) => permission.menu)
  permissions: Relation<Permission>[];
}
