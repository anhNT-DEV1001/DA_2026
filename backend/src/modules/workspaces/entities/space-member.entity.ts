import { Column, Entity, JoinColumn, ManyToOne, type Relation } from 'typeorm';
import { BaseEntity } from '../../../infrastructure/database/entites/base.entity.js';
import { Space } from './space.entity.js';
import { WorkspaceMember } from './workspace-member.entity.js';

@Entity('space-members')
export class SpaceMember extends BaseEntity {
  @Column({ name: 'space_id', type: 'int' })
  spaceId: number;

  @ManyToOne(() => Space, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'space_id' })
  space: Relation<Space>;

  @Column({ name: 'workspace_member_id', type: 'int' })
  workspaceMemberId: number;

  @ManyToOne(() => WorkspaceMember, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_member_id' })
  workspaceMember: Relation<WorkspaceMember>;
}
