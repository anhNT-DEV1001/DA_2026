import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Workspace } from './entities/workspace.entity.js';
import { Repository } from 'typeorm';
import { UserResponse } from '../users/dtos/users.dto.js';

@Injectable()
export class WorkspacesService {
  constructor(
    @InjectRepository(Workspace)
    private readonly workspaceRepo: Repository<Workspace>,
  ) {}

  async getCurrentUserWorkspace(user: UserResponse): Promise<Workspace[]> {
    const data = await this.workspaceRepo.find({
      where: { ownerId: user.id },
    });
    return data;
  }

  async getWorkspaceById(id: number): Promise<Workspace> {
    const ws = await this.workspaceRepo.findOne({
      where: { id },
    });
    if (!ws) throw new BadRequestException('Không tồn tại workspace');
    return ws;
  }

  async removeWorkspace(id: number, user: UserResponse) {
    const ws = await this.getWorkspaceById(id);
    if (!ws) throw new BadRequestException('Không tồn tại workspace');
    if (ws.ownerId !== user.id)
      throw new BadRequestException('Bạn không có quyền xóa workspace này');

    ws.deletedBy = user.id;
    await this.workspaceRepo.softRemove(ws);
  }
}
