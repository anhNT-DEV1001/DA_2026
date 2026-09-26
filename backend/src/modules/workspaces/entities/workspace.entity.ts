import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  type Relation,
} from 'typeorm';
import { SoftDeleteEntity } from '../../../infrastructure/database/entites/soft-delete.entity.js';
import { User } from '../../users/entities/users.entity.js';
import { WorkspaceMember } from './workspace-member.entity.js';
import { Project } from './project.entity.js';

@Entity('workspaces')
export class Workspace extends SoftDeleteEntity {
  @Column({ type: 'varchar', length: 255, nullable: false })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  slug: string;

  @Column({ name: 'owner_id', type: 'int', nullable: false })
  ownerId: number;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'owner_id' })
  owner: Relation<User>;

  @OneToMany(() => WorkspaceMember, (member) => member.workspace)
  members: Relation<WorkspaceMember>[];

  @OneToMany(() => Project, (project) => project.workspace)
  projects: Relation<Project>[];
}
