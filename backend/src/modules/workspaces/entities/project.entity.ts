import { Column, Entity } from 'typeorm';
import { SoftDeleteEntity } from '../../../infrastructure/database/entites/soft-delete.entity.js';

@Entity('projects')
export class Projects extends SoftDeleteEntity {
  @Column({ name: 'workspace_id', type: 'int', nullable: true, default: null })
  workspaceId: number | null;
  @Column({ type: 'varchar', length: 255, nullable: false })
  name: string;
  @Column({ type: 'varchar', length: 255, nullable: false })
  alias: string;
  @Column({ type: 'date', nullable: false })
  sDate: Date;
  @Column({ type: 'date', nullable: true })
  eDate: Date | null;
  @Column({ type: 'text', nullable: true, default: null })
  description: string | null;
}
