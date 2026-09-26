import { Column, Entity, JoinColumn, ManyToOne, type Relation } from 'typeorm';
import { BaseEntity } from '../../../infrastructure/database/entites/base.entity.js';
import { Workspace } from './workspace.entity.js';
import { User } from '../../users/entities/users.entity.js';
import { Role } from '../../admin/entites/role.entity.js';

@Entity('workspace_members')
export class WorkspaceMember extends BaseEntity {
  @Column({ name: 'workspace_id', type: 'int', nullable: false })
  workspaceId: number;

  @ManyToOne(() => Workspace, (workspace) => workspace.members, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'workspace_id' })
  workspace: Relation<Workspace>;

  @Column({ name: 'user_id', type: 'int', nullable: false })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: Relation<User>;

  @Column({ name: 'role_id', type: 'int', nullable: false })
  roleId: number;

  @ManyToOne(() => Role, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'role_id' })
  role: Relation<Role>;

  @Column({ type: 'varchar', length: 255, nullable: false, default: 'active' })
  status: string;

  @Column({ name: 'joined_at', type: 'timestamp', nullable: true })
  joinedAt: Date | null;
}
