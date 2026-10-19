import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { DataSource, EntityManager, In } from 'typeorm';
import { Workspace } from '../workspaces/entities/workspace.entity.js';
import { WorkspaceMember } from '../workspaces/entities/workspace-member.entity.js';
import { User } from '../users/entities/users.entity.js';
import { Task, TaskStatus } from './entities/index.js';
import { TaskActivity } from './entities/task-activity.entity.js';
import {
  CreateTaskDto,
  TaskListQuery,
  TaskPageQuery,
  UpdateTaskDto,
} from './dtos/task.dto.js';
import {
  PageMetadataResponse,
  PageResponse,
} from '../../common/responses/paginate.response.js';

const activeStatuses = ['MS001', 'active'];

@Injectable()
export class TasksService {
  constructor(private readonly source: DataSource) {}

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

  private async validate(
    manager: EntityManager,
    workspace: Workspace,
    task: Task,
    validateAssignee: boolean,
  ) {
    if (task.startDate && task.dueDate && task.startDate > task.dueDate) {
      throw new BadRequestException(
        'Ngày bắt đầu không được sau ngày kết thúc',
      );
    }
    const status = await manager
      .getRepository(TaskStatus)
      .findOneBy({ id: task.statusId, workspaceId: workspace.id });
    if (!status)
      throw new BadRequestException('Trạng thái không thuộc workspace');
    if (validateAssignee && task.assigneeId !== null) {
      const user = await manager.getRepository(User).findOne({
        select: { id: true },
        where: { id: task.assigneeId },
        lock: { mode: 'pessimistic_read' },
      });
      const member =
        task.assigneeId === workspace.ownerId ||
        (await manager.getRepository(WorkspaceMember).findOne({
          select: { id: true },
          where: {
            workspaceId: workspace.id,
            userId: task.assigneeId,
            status: In(activeStatuses),
          },
          lock: { mode: 'pessimistic_read' },
        }));
      if (!user || !member)
        throw new BadRequestException(
          'Người phụ trách phải là chủ sở hữu hoặc thành viên đang hoạt động',
        );
    }
    task.completedAt = status.isCompleted
      ? (task.completedAt ?? new Date())
      : null;
  }

  private snapshot(task: Task): Record<string, unknown> {
    return {
      title: task.title,
      description: task.description,
      statusId: task.statusId,
      assigneeId: task.assigneeId,
      priority: task.priority,
      startDate: task.startDate,
      dueDate: task.dueDate,
      completedAt: task.completedAt?.toISOString() ?? null,
    };
  }

  private async record(
    manager: EntityManager,
    task: Task,
    actorId: number,
    action: TaskActivity['action'],
    before: Record<string, unknown> | null,
  ) {
    await manager.getRepository(TaskActivity).save({
      taskId: task.id,
      actorId,
      action,
      before,
      after: action === 'deleted' ? null : this.snapshot(task),
    });
  }

  async statuses(workspaceId: number, actorId: number) {
    await this.workspace(this.source.manager, workspaceId, actorId);
    return this.source.getRepository(TaskStatus).find({
      where: { workspaceId },
      order: { displayOrder: 'ASC', id: 'ASC' },
    });
  }

  async list(workspaceId: number, actorId: number, query: TaskListQuery) {
    await this.workspace(this.source.manager, workspaceId, actorId);
    const builder = this.source
      .getRepository(Task)
      .createQueryBuilder('task')
      .where('task.workspaceId = :workspaceId', { workspaceId });
    if (query.search)
      builder.andWhere('task.title ILIKE :search', {
        search: `%${query.search}%`,
      });
    if (query.statusId !== undefined)
      builder.andWhere('task.statusId = :statusId', {
        statusId: query.statusId,
      });
    if (query.assigneeId !== undefined)
      builder.andWhere('task.assigneeId = :assigneeId', {
        assigneeId: query.assigneeId,
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
      // A task with one planned date is a point; undated tasks are excluded.
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
    const [items, total] = await this.source
      .getRepository(TaskActivity)
      .createQueryBuilder('activity')
      .withDeleted()
      .innerJoin('activity.task', 'task', 'task.workspaceId = :workspaceId', {
        workspaceId,
      })
      .orderBy('activity.id', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();
    return new PageResponse(
      items,
      new PageMetadataResponse({ pageRequest: query, itemCount: total }),
    );
  }

  async activities(
    workspaceId: number,
    taskId: number,
    actorId: number,
    query: TaskPageQuery,
  ) {
    await this.workspace(this.source.manager, workspaceId, actorId);
    // History remains available for soft-deleted tasks, still scoped to workspace.
    await this.task(this.source.manager, workspaceId, taskId, false, true);
    const [items, total] = await this.source
      .getRepository(TaskActivity)
      .findAndCount({
        where: { taskId },
        order: { id: 'DESC' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      });
    return new PageResponse(
      items,
      new PageMetadataResponse({ pageRequest: query, itemCount: total }),
    );
  }

  async create(workspaceId: number, actorId: number, dto: CreateTaskDto) {
    return this.source.transaction(async (manager) => {
      const workspace = await this.workspace(
        manager,
        workspaceId,
        actorId,
        true,
      );
      const defaultStatus =
        dto.statusId === undefined
          ? await manager
              .getRepository(TaskStatus)
              .findOneBy({ workspaceId, code: 'todo' })
          : null;
      if (dto.statusId === undefined && !defaultStatus)
        throw new BadRequestException('Workspace chưa có trạng thái mặc định');
      const repo = manager.getRepository(Task);
      const task = repo.create({
        workspaceId,
        title: dto.title,
        description: dto.description ?? null,
        statusId: dto.statusId ?? defaultStatus!.id,
        assigneeId: dto.assigneeId ?? null,
        priority: dto.priority ?? 'medium',
        startDate: dto.startDate ?? null,
        dueDate: dto.dueDate ?? null,
        completedAt: null,
        createdBy: actorId,
        updatedBy: actorId,
      });
      await this.validate(manager, workspace, task, true);
      await repo.save(task);
      await this.record(manager, task, actorId, 'created', null);
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
      const workspace = await this.workspace(
        manager,
        workspaceId,
        actorId,
        true,
      );
      const task = await this.task(manager, workspaceId, taskId, true);
      const before = this.snapshot(task);
      for (const key of [
        'title',
        'description',
        'statusId',
        'assigneeId',
        'priority',
        'startDate',
        'dueDate',
      ] as const) {
        if (dto[key] !== undefined) Object.assign(task, { [key]: dto[key] });
      }
      await this.validate(
        manager,
        workspace,
        task,
        dto.assigneeId !== undefined,
      );
      if (JSON.stringify(before) === JSON.stringify(this.snapshot(task)))
        return task;
      task.updatedBy = actorId;
      await manager.getRepository(Task).save(task);
      await this.record(manager, task, actorId, 'updated', before);
      return task;
    });
  }

  async remove(workspaceId: number, taskId: number, actorId: number) {
    return this.source.transaction(async (manager) => {
      await this.workspace(manager, workspaceId, actorId, true);
      const task = await this.task(manager, workspaceId, taskId, true);
      const before = this.snapshot(task);
      task.deletedBy = actorId;
      task.updatedBy = actorId;
      task.deletedAt = new Date();
      await manager.getRepository(Task).save(task);
      await this.record(manager, task, actorId, 'deleted', before);
      return { id: task.id, deletedAt: task.deletedAt };
    });
  }
}
