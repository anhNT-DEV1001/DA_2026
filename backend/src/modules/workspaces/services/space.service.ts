import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, ILike, Repository } from 'typeorm';
import { Space } from '../entities/space.entity.js';
import {
  CreateSpaceDto,
  SpaceRequest,
  UpdateSpaceDto,
} from '../dtos/space.dto.js';
import { UserResponse } from '../../users/dtos/index.js';
import {
  PageMetadataResponse,
  PageResponse,
} from '../../../common/responses/index.js';
import { TaskStatusService } from '../../tasks/services/task-status.service.js';

@Injectable()
export class SpaceService {
  constructor(
    @InjectRepository(Space)
    private readonly spaceRepo: Repository<Space>,
    private readonly dataSource: DataSource,
    private readonly taskStatusService: TaskStatusService,
  ) {}

  async findAll(
    workspaceId: number,
    query: SpaceRequest,
  ): Promise<PageResponse<Space> | Space[]> {
    const where: any = { workspaceId };

    if (query.search?.trim()) {
      where.name = ILike(`%${query.search.trim()}%`);
    }

    if (query.page !== undefined || query.limit !== undefined) {
      const [items, itemCount] = await this.spaceRepo.findAndCount({
        where,
        order: { displayOrder: 'ASC', createdAt: 'DESC' },
        skip: query.skip,
        take: query.limit ?? 20,
      });
      const meta = new PageMetadataResponse({ pageRequest: query, itemCount });
      return new PageResponse(items, meta);
    }

    return this.spaceRepo.find({
      where,
      order: { displayOrder: 'ASC', createdAt: 'DESC' },
    });
  }

  async findOne(workspaceId: number, spaceId: number): Promise<Space> {
    const space = await this.spaceRepo.findOne({
      where: { id: spaceId, workspaceId },
    });
    if (!space) {
      throw new NotFoundException(
        `Không tìm thấy space #${spaceId} trong workspace #${workspaceId}`,
      );
    }
    return space;
  }

  async create(
    workspaceId: number,
    dto: CreateSpaceDto,
    user?: UserResponse,
  ): Promise<Space> {
    const exists = await this.spaceRepo.exists({
      where: { workspaceId, name: dto.name.trim() },
    });
    if (exists) {
      throw new BadRequestException(
        `Space với tên "${dto.name.trim()}" đã tồn tại trong workspace này.`,
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const space = manager.getRepository(Space).create({
        name: dto.name.trim(),
        description: dto.description?.trim() ?? null,
        displayOrder: dto.displayOrder ?? 1,
        workspaceId,
        createdBy: user?.id ?? null,
        updatedBy: user?.id ?? null,
      });
      await manager.getRepository(Space).save(space);
      await this.taskStatusService.ensureDefaultStatuses(
        manager,
        space.id,
        user?.id ?? null,
      );
      return space;
    });
  }

  async update(
    workspaceId: number,
    spaceId: number,
    dto: UpdateSpaceDto,
    user?: UserResponse,
  ): Promise<Space> {
    const space = await this.findOne(workspaceId, spaceId);

    if (dto.name !== undefined) {
      const trimmed = dto.name.trim();
      if (trimmed !== space.name) {
        const exists = await this.spaceRepo.exists({
          where: { workspaceId, name: trimmed },
        });
        if (exists) {
          throw new BadRequestException(
            `Space với tên "${trimmed}" đã tồn tại trong workspace này.`,
          );
        }
      }
      space.name = trimmed;
    }

    if (dto.description !== undefined) {
      space.description = dto.description?.trim() ?? null;
    }

    if (dto.displayOrder !== undefined) {
      space.displayOrder = dto.displayOrder;
    }

    space.updatedBy = user?.id ?? null;

    return this.spaceRepo.save(space);
  }

  async remove(
    workspaceId: number,
    spaceId: number,
    user?: UserResponse,
  ): Promise<Space> {
    const space = await this.findOne(workspaceId, spaceId);
    space.deletedBy = user?.id ?? null;
    return this.spaceRepo.softRemove(space);
  }
}
