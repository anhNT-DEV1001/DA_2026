import { Column, Entity, ManyToOne, JoinColumn } from 'typeorm';
import { SoftDeleteEntity } from '../../../infrastructure/database/entites/soft-delete.entity.js';
import { Workspace } from './workspace.entity.js';

@Entity('spaces')
export class Space extends SoftDeleteEntity {
  @Column({ type: 'varchar', length: 255, nullable: false })
  name: string;

  @Column({ name: 'workspace_id', type: 'int' })
  workspaceId: number;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'display_order', type: 'int', default: 1 })
  displayOrder: number;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id' })
  workspace: Workspace;
}
