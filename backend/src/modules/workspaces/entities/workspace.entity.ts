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

@Entity('workspaces')
export class Workspace extends SoftDeleteEntity {
  @Column({ type: 'varchar', length: 255, nullable: false })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 255, nullable: false })
  slug: string;

  @Column({ name: 'owner_id', type: 'int', nullable: false })
  ownerId: number;

  @Column({ type: 'enum', enum: ['public', 'private'], default: 'private' })
  mode: 'public' | 'private';

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'owner_id' })
  owner: Relation<User>;

  @OneToMany(() => WorkspaceMember, (member) => member.workspace)
  members: Relation<WorkspaceMember>[];
}
