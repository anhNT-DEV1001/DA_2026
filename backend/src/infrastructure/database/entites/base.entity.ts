import {
  Column,
  CreateDateColumn,
  PrimaryGeneratedColumn,
  BaseEntity as TypeOrmEntity,
  UpdateDateColumn,
} from 'typeorm';

export abstract class BaseEntity extends TypeOrmEntity {
  @PrimaryGeneratedColumn('increment')
  id: number;
  @CreateDateColumn({ type: 'timestamp', name: 'created_at', nullable: true })
  createdAt: Date | null;
  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at', nullable: true })
  updatedAt: Date | null;
  @Column({ type: 'int', nullable: true, name: 'created_by' })
  createdBy: number | null;
  @Column({ type: 'int', name: 'updated_by', nullable: true })
  updatedBy: number | null;
}
