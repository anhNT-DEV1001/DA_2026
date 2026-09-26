import { Column, DeleteDateColumn } from 'typeorm';
import { BaseEntity } from './base.entity.js';

export abstract class SoftDeleteEntity extends BaseEntity {
  @DeleteDateColumn({ type: 'timestamp', name: 'deleted_at', nullable: true })
  deletedAt: Date | null;
  @Column({ type: 'int', name: 'deleted_by', nullable: true })
  deletedBy: number | null;
}
