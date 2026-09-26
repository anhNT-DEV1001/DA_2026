import { Column, Entity, JoinColumn, ManyToOne, type Relation } from 'typeorm';
import { SoftDeleteEntity } from '../../../infrastructure/database/entites/soft-delete.entity.js';
import { Workspace } from './workspace.entity.js';

@Entity('projects')
export class Project extends SoftDeleteEntity {
  @Column({ type: 'varchar', length: 255, nullable: false })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'workspace_id', type: 'int', nullable: false })
  workspaceId: number;

  @ManyToOne(() => Workspace, (workspace) => workspace.projects, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'workspace_id' })
  workspace: Relation<Workspace>;

  @Column({ type: 'varchar', length: 100, default: 'public' })
  mode: 'public' | 'private';
}
