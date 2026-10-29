import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager, QueryFailedError } from 'typeorm';
import { TaskStatus } from '../entities/task-status.entity.js';
import { Space } from '../../workspaces/entities/space.entity.js';
import { CreateTaskStatusDto, UpdateTaskStatusDto } from '../dtos/task.dto.js';
import { TaskRealtimeService } from './task-realtime.service.js';

const DEFAULT_STATUSES = [
  { code: 'todo', name: 'Chưa bắt đầu', displayOrder: 0, isCompleted: false },
  {
    code: 'in_progress',
    name: 'Đang thực hiện',
    displayOrder: 1,
    isCompleted: false,
  },
  {
    code: 'in_review',
    name: 'Chờ kiểm tra',
    displayOrder: 2,
    isCompleted: false,
  },
  { code: 'done', name: 'Hoàn thành', displayOrder: 3, isCompleted: true },
] as const;

export interface InitialTaskStatus {
  code: string;
  name: string;
  isCompleted?: boolean;
}

@Injectable()
export class TaskStatusService {
  constructor(
    private readonly source: DataSource,
    private readonly realtime: TaskRealtimeService,
  ) {}

  /**
   * Call inside the space-creation transaction so creation cannot leave a partial setup.
   * Seeds the given statuses (in order) or the default set when none are given — never both.
   */
  async ensureDefaultStatuses(
    manager: EntityManager,
    spaceId: number,
    actorId: number | null,
    statuses?: InitialTaskStatus[],
  ): Promise<void> {
    const codes = new Set(statuses?.map((status) => status.code));
    if (statuses && codes.size !== statuses.length)
      throw new BadRequestException('Mã trạng thái bị trùng trong space');

    const values = statuses?.length
      ? statuses.map((status, index) => ({
          code: status.code,
          name: status.name,
          displayOrder: index,
          isCompleted: status.isCompleted ?? false,
        }))
      : DEFAULT_STATUSES;
    await manager
      .createQueryBuilder()
      .insert()
      .into(TaskStatus)
      .values(
        values.map((status) => ({
          ...status,
          spaceId,
          createdBy: actorId,
          updatedBy: actorId,
        })),
      )
      .orIgnore()
      .execute();
  }

  private async resolveSpace(
    manager: EntityManager,
    workspaceId: number,
    spaceId: number,
  ): Promise<Space> {
    const space = await manager.getRepository(Space).findOne({
      select: { id: true, workspaceId: true },
      where: { id: spaceId },
    });
    if (!space) throw new NotFoundException('Không tìm thấy space');
    if (space.workspaceId !== workspaceId)
      throw new BadRequestException('Space không thuộc workspace này');
    return space;
  }

  async list(workspaceId: number, spaceId: number) {
    await this.resolveSpace(this.source.manager, workspaceId, spaceId);
    return this.source.getRepository(TaskStatus).find({
      where: { spaceId },
      order: { displayOrder: 'ASC' },
    });
  }

  async create(
    workspaceId: number,
    actorId: number,
    dto: CreateTaskStatusDto,
    origin?: string,
  ) {
    const status = await this.source.transaction(async (manager) => {
      await this.resolveSpace(manager, workspaceId, dto.spaceId);
      const status = manager.getRepository(TaskStatus).create({
        spaceId: dto.spaceId,
        code: dto.code,
        name: dto.name,
        displayOrder: dto.displayOrder ?? 0,
        isCompleted: dto.isCompleted ?? false,
        createdBy: actorId,
        updatedBy: actorId,
      });
      try {
        return await manager.getRepository(TaskStatus).save(status);
      } catch (err) {
        if (
          err instanceof QueryFailedError &&
          (err as any).constraint === 'UQ_task_statuses_space_code'
        ) {
          throw new ConflictException(
            `Mã trạng thái "${dto.code}" đã tồn tại trong space này`,
          );
        }
        throw err;
      }
    });
    this.statusChanged(workspaceId, dto.spaceId, actorId, origin);
    return status;
  }

  async update(
    workspaceId: number,
    spaceId: number,
    statusId: number,
    actorId: number,
    dto: UpdateTaskStatusDto,
    origin?: string,
  ) {
    const saved = await this.source.transaction(async (manager) => {
      await this.resolveSpace(manager, workspaceId, spaceId);
      const repo = manager.getRepository(TaskStatus);
      const status = await repo.findOne({
        where: { id: statusId, spaceId },
      });
      if (!status)
        throw new NotFoundException('Không tìm thấy trạng thái trong space');

      if (dto.name !== undefined) status.name = dto.name;
      if (dto.displayOrder !== undefined)
        status.displayOrder = dto.displayOrder;
      if (dto.isCompleted !== undefined) status.isCompleted = dto.isCompleted;
      status.updatedBy = actorId;

      return repo.save(status);
    });
    this.statusChanged(workspaceId, spaceId, actorId, origin);
    return saved;
  }

  async remove(
    workspaceId: number,
    spaceId: number,
    statusId: number,
    actorId?: number,
    origin?: string,
  ) {
    const result = await this.source.transaction(async (manager) => {
      await this.resolveSpace(manager, workspaceId, spaceId);
      const repo = manager.getRepository(TaskStatus);
      const status = await repo.findOne({
        where: { id: statusId, spaceId },
      });
      if (!status)
        throw new NotFoundException('Không tìm thấy trạng thái trong space');

      try {
        await repo.remove(status);
      } catch (err) {
        if (err instanceof QueryFailedError && (err as any).code === '23503') {
          throw new ConflictException(
            'Không thể xóa trạng thái đang được sử dụng bởi task',
          );
        }
        throw err;
      }
      return { id: statusId };
    });
    this.statusChanged(workspaceId, spaceId, actorId, origin);
    return result;
  }

  /** Cột của board thay đổi → client tải lại danh sách trạng thái và các cột */
  private statusChanged(
    workspaceId: number,
    spaceId: number,
    actorId?: number,
    origin?: string,
  ) {
    this.realtime.emit(
      { workspaceId, spaceId },
      'status.changed',
      { spaceId, actorId },
      origin,
    );
  }
}
