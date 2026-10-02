import { SoftDeleteEntity } from '../../../infrastructure/database/entites/index.js';
import { Column, Entity } from 'typeorm';

@Entity('master_data')
export class MasterData extends SoftDeleteEntity {
  @Column({ type: 'varchar', length: 255, nullable: false })
  group: string;
  @Column({ type: 'text', nullable: true })
  value: string;
  @Column({ type: 'varchar', length: 255, nullable: true })
  name: string;
  @Column({ name: 'name_group', type: 'varchar', length: 255, nullable: true })
  nameGroup: string;
  @Column({ type: 'text', nullable: true })
  description: string | null;
  @Column({ type: 'integer', default: 0 })
  displayOrder: number;
}
