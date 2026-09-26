import { SoftDeleteEntity } from '../../../infrastructure/database/entites/index.js';
import { Column } from 'typeorm';

export class MasterData extends SoftDeleteEntity {
  @Column({ type: 'varchar', length: 255, nullable: false })
  group: string;
  @Column({ type: 'text', nullable: true })
  value: string;
  @Column({ type: 'varchar', length: 255, nullable: true })
  name: string;
  @Column({ type: 'text', nullable: true })
  description: string | null;
  @Column({ type: 'integer', default: 0 })
  displayOrder: number;
}
