import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WorkspaceMember } from '../entities/workspace-member.entity.js';
import { Repository } from 'typeorm';

@Injectable()
export class WorkspaceMemberService {
  constructor(
    @InjectRepository(WorkspaceMember)
    private readonly workmemRepo: Repository<WorkspaceMember>,
  ) {}

  async getWorkspaceMember(workspaceId: number) {}
  async saveWorkspaceMember(workspaceId: number, user_ids: number[]) {}
  async removeWorkspaceMember(workspaceId: number, userId: number) {}
}
