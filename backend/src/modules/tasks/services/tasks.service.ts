import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { DataSource, EntityManager, In } from 'typeorm';
import { Workspace } from '../../workspaces/entities/workspace.entity.js';
import { WorkspaceMember } from '../../workspaces/entities/workspace-member.entity.js';
import { Task, TaskStatus } from '../entities/index.js';
import {
  CreateTaskDto,
  TaskListQuery,
  TaskPageQuery,
  UpdateTaskDto,
} from '../dtos/task.dto.js';
import {
  PageMetadataResponse,
  PageResponse,
} from '../../../common/responses/paginate.response.js';
import { TaskActivityService } from './task-activity.service.js';

const activeStatuses = ['MS001', 'active'];

@Injectable()
export class TasksService {
  constructor(
    private readonly source: DataSource,
    private readonly activity: TaskActivityService,
  ) {}

  private positiveId(id: number) {
    if (!Number.isSafeInteger(id) || id < 1)
      throw new BadRequestException('ID phải là số nguyên dương');
  }

  private async workspace(
    manager: EntityManager,
    workspaceId: number,
    actorId: number,
    lock = false,
  ) {
    this.positiveId(workspaceId);
    if (!actorId) throw new UnauthorizedException();
    const workspace = await manager.getRepository(Workspace).findOne({
      select: { id: true, ownerId: true },
      where: { id: workspaceId },
      ...(lock ? { lock: { mode: 'pessimistic_read' as const } } : {}),
    });
    if (!workspace) throw new NotFoundException('Không tìm thấy workspace');
    if (workspace.ownerId !== actorId) {
      const member = await manager.getRepository(WorkspaceMember).findOne({
        select: { id: true },
        where: { workspaceId, userId: actorId, status: In(activeStatuses) },
        ...(lock ? { lock: { mode: 'pessimistic_read' as const } } : {}),
      });
      if (!member)
        throw new ForbiddenException(
          'Bạn không phải thành viên đang hoạt động trong workspace',
        );
    }
    return workspace;
  }

  private async task(
    manager: EntityManager,
    workspaceId: number,
    taskId: number,
    lock = false,
    withDeleted = false,
  ) {
    this.positiveId(taskId);
    const task = await manager.getRepository(Task).findOne({
      where: { id: taskId, workspaceId },
      withDeleted,
      ...(lock ? { lock: { mode: 'pessimistic_write' as const } } : {}),
    });
    if (!task)
      throw new NotFoundException('Không tìm thấy task trong workspace');
    return task;
  }

  private async validate(manager: EntityManager, task: Task) {
    if (task.startDate && task.dueDate && task.startDate > task.dueDate) {
      throw new BadRequestException(
        'Ngày bắt đầu không được sau ngày kết thúc',
      );
    }
    if (!task.spaceId)
      throw new BadRequestException('Task phải thuộc về một space');
    const status = await manager
      .getRepository(TaskStatus)
      .findOneBy({ id: task.statusId, spaceId: task.spaceId });
    if (!status)
      throw new BadRequestException('Trạng thái không thuộc space này');
    task.completedAt = status.isCompleted
      ? (task.completedAt ?? new Date())
      : null;
    return status;
  }

  async list(workspaceId: number, actorId: number, query: TaskListQuery) {
    await this.workspace(this.source.manager, workspaceId, actorId);
    const builder = this.source
      .getRepository(Task)
      .createQueryBuilder('task')
      .where('task.workspaceId = :workspaceId', { workspaceId });
    if (query.spaceId !== undefined)
      builder.andWhere('task.spaceId = :spaceId', { spaceId: query.spaceId });
    if (query.search)
      builder.andWhere('task.title ILIKE :search', {
        search: `%${query.search}%`,
      });
    if (query.statusId !== undefined)
      builder.andWhere('task.statusId = :statusId', {
        statusId: query.statusId,
      });
    if (query.priority !== undefined)
      builder.andWhere('task.priority = :priority', {
        priority: query.priority,
      });
    if (query.from || query.to) {
      if (!query.from || !query.to || query.from > query.to)
        throw new BadRequestException('Cần khoảng ngày từ/đến hợp lệ');
      if (Date.parse(query.to) - Date.parse(query.from) > 365 * 86400000)
        throw new BadRequestException('Khoảng xem tối đa 366 ngày');
      builder.andWhere(
        'COALESCE(task.startDate, task.dueDate) <= :to AND COALESCE(task.dueDate, task.startDate) >= :from',
        { from: query.from, to: query.to },
      );
    }
    const [items, total] = await builder
      .orderBy('task.id', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();
    return new PageResponse(
      items,
      new PageMetadataResponse({ pageRequest: query, itemCount: total }),
    );
  }

  async detail(workspaceId: number, taskId: number, actorId: number) {
    await this.workspace(this.source.manager, workspaceId, actorId);
    return this.task(this.source.manager, workspaceId, taskId);
  }

  async workspaceActivities(
    workspaceId: number,
    actorId: number,
    query: TaskPageQuery,
  ) {
    await this.workspace(this.source.manager, workspaceId, actorId);
    return this.activity.listByWorkspace(workspaceId, query);
  }

  async activities(
    workspaceId: number,
    taskId: number,
    actorId: number,
    query: TaskPageQuery,
  ) {
    await this.workspace(this.source.manager, workspaceId, actorId);
    await this.task(this.source.manager, workspaceId, taskId, false, true);
    return this.activity.listByTask(workspaceId, taskId, query);
  }

  async create(workspaceId: number, actorId: number, dto: CreateTaskDto) {
    return this.source.transaction(async (manager) => {
      await this.workspace(manager, workspaceId, actorId, true);
      const defaultStatus =
        dto.statusId === undefined
          ? await manager
              .getRepository(TaskStatus)
              .findOneBy({ spaceId: dto.spaceId, code: 'todo' })
          : null;
      if (dto.statusId === undefined && !defaultStatus)
        throw new BadRequestException('Space chưa có trạng thái mặc định');
      const repo = manager.getRepository(Task);
      const task = repo.create({
        workspaceId,
        spaceId: dto.spaceId,
        title: dto.title,
        description: dto.description ?? null,
        statusId: dto.statusId ?? defaultStatus!.id,
        priority: dto.priority ?? 'medium',
        startDate: dto.startDate ?? null,
        dueDate: dto.dueDate ?? null,
        completedAt: null,
        createdBy: actorId,
        updatedBy: actorId,
      });
      const status = await this.validate(manager, task);
      await repo.save(task);
      const snap = await this.activity.snapshot(manager, task, {
        statusName: status.name,
        assigneeIds: [],
      });
      await this.activity.record(manager, task, actorId, 'created', null, snap);
      return task;
    });
  }

  async update(
    workspaceId: number,
    taskId: number,
    actorId: number,
    dto: UpdateTaskDto,
  ) {
    return this.source.transaction(async (manager) => {
      await this.workspace(manager, workspaceId, actorId, true);
      const task = await this.task(manager, workspaceId, taskId, true);
      const before = await this.activity.snapshot(manager, task);
      for (const key of [
        'title',
        'description',
        'statusId',
        'priority',
        'startDate',
        'dueDate',
      ] as const) {
        if (dto[key] !== undefined) Object.assign(task, { [key]: dto[key] });
      }
      const status = await this.validate(manager, task);
      const after = await this.activity.snapshot(manager, task, {
        statusName: status.name,
      });
      const changed = this.activity.diff(before, after);
      if (!changed.length) return task;
      task.updatedBy = actorId;
      await manager.getRepository(Task).save(task);
      await this.activity.record(manager, task, actorId, 'updated', before, after);
      return task;
    });
  }

  async remove(workspaceId: number, taskId: number, actorId: number) {
    return this.source.transaction(async (manager) => {
      await this.workspace(manager, workspaceId, actorId, true);
      const task = await this.task(manager, workspaceId, taskId, true);
      const before = await this.activity.snapshot(manager, task);
      task.deletedBy = actorId;
      task.updatedBy = actorId;
      task.deletedAt = new Date();
      await manager.getRepository(Task).save(task);
      await this.activity.record(manager, task, actorId, 'deleted', before);
      return { id: task.id, deletedAt: task.deletedAt };
    });
  }
}
