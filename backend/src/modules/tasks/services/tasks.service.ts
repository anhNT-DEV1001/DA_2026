import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager, In } from 'typeorm';
import { WorkspaceAccessService } from '../../workspaces/services/workspace-access.service.js';
import { Task, TaskAssigned, TaskStatus } from '../entities/index.js';
import { MasterData } from '../../admin/entites/index.js';
import {
  CreateTaskDto,
  MoveTaskDto,
  TaskActivityQuery,
  TaskListQuery,
  TaskPageQuery,
  UpdateTaskDto,
} from '../dtos/task.dto.js';
import {
  PageMetadataResponse,
  PageResponse,
} from '../../../common/responses/paginate.response.js';
import { TaskActivityService } from './task-activity.service.js';
import { TaskRealtimeService } from './task-realtime.service.js';

const PRIORITY_GROUP = 'PRIORITY';
const DEFAULT_PRIORITY = 'PRIORITY002';
// Khoảng cách position giữa hai task liền kề; nhỏ hơn MIN_GAP thì đánh số lại cột
const POSITION_STEP = 1024;
const MIN_GAP = 1e-6;

@Injectable()
export class TasksService {
  constructor(
    private readonly source: DataSource,
    private readonly activity: TaskActivityService,
    private readonly realtime: TaskRealtimeService,
    private readonly access: WorkspaceAccessService,
  ) {}

  private positiveId(id: number) {
    if (!Number.isSafeInteger(id) || id < 1)
      throw new BadRequestException('ID phải là số nguyên dương');
  }

  /** Lọc theo các space user được xem; owner (null) không bị lọc */
  private async spaceScope(
    workspaceId: number,
    actorId: number,
    spaceId?: number,
  ): Promise<number[] | null> {
    if (spaceId !== undefined) {
      await this.access.assertSpaceMember(actorId, workspaceId, spaceId);
      return [spaceId];
    }
    await this.access.assertWorkspaceMember(actorId, workspaceId);
    return this.access.accessibleSpaceIds(actorId, workspaceId);
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

  /** Kiểm tra quyền trên space chứa task rồi trả về task; `lock` khoá cả membership lẫn task */
  private async guardedTask(
    manager: EntityManager,
    workspaceId: number,
    taskId: number,
    actorId: number,
    { lock = false, withDeleted = false } = {},
  ) {
    const { isOwner } = await this.access.assertWorkspaceMember(
      actorId,
      workspaceId,
      { manager, lock },
    );
    const task = await this.task(manager, workspaceId, taskId, lock, withDeleted);
    if (task.spaceId)
      await this.access.assertSpaceMember(actorId, workspaceId, task.spaceId, {
        manager,
        lock,
      });
    else if (!isOwner)
      throw new ForbiddenException('Task không thuộc space nào bạn tham gia');
    return task;
  }

  private async validate(manager: EntityManager, task: Task) {
    if (task.startDate && task.dueDate && task.startDate > task.dueDate) {
      throw new BadRequestException(
        'Ngày bắt đầu không được sau ngày kết thúc',
      );
    }
    const priority = await manager
      .getRepository(MasterData)
      .existsBy({ group: PRIORITY_GROUP, value: task.priority });
    if (!priority) throw new BadRequestException('Mức ưu tiên không hợp lệ');
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

  /** Vị trí đầu cột: nhỏ hơn mọi task đang có trong trạng thái */
  private async topPosition(
    manager: EntityManager,
    spaceId: number,
    statusId: number,
    excludeId?: number,
  ) {
    const builder = manager
      .getRepository(Task)
      .createQueryBuilder('task')
      .select('MIN(task.position)', 'min')
      .where('task.spaceId = :spaceId AND task.statusId = :statusId', {
        spaceId,
        statusId,
      });
    if (excludeId) builder.andWhere('task.id <> :excludeId', { excludeId });
    const row = await builder.getRawOne<{ min: number | null }>();
    return row?.min == null ? 0 : Number(row.min) - POSITION_STEP;
  }

  /** Đánh số lại position của một cột theo thứ tự hiện tại */
  private async rebalance(
    manager: EntityManager,
    spaceId: number,
    statusId: number,
  ) {
    await manager.query(
      `UPDATE "tasks" t SET "position" = r.rn * $3
        FROM (
          SELECT "id", ROW_NUMBER() OVER (ORDER BY "position" ASC, "id" DESC) AS rn
          FROM "tasks"
          WHERE "space_id" = $1 AND "status_id" = $2 AND "deleted_at" IS NULL
        ) r
        WHERE t."id" = r."id"`,
      [spaceId, statusId, POSITION_STEP],
    );
  }

  /** Position để đặt task ngay sau `afterId` (null = đầu cột) */
  private async positionAfter(
    manager: EntityManager,
    task: Task,
    afterId: number | null,
    retry = true,
  ): Promise<number> {
    const repo = manager.getRepository(Task);
    let prev: number | null = null;
    if (afterId !== null) {
      if (afterId === task.id)
        throw new BadRequestException('Không thể đặt task sau chính nó');
      const after = await repo.findOneBy({
        id: afterId,
        spaceId: task.spaceId!,
        statusId: task.statusId,
      });
      if (!after)
        throw new BadRequestException('Task đứng trước không thuộc cột này');
      prev = after.position;
    }
    const nextBuilder = repo
      .createQueryBuilder('task')
      .select('MIN(task.position)', 'min')
      .where('task.spaceId = :spaceId AND task.statusId = :statusId', {
        spaceId: task.spaceId,
        statusId: task.statusId,
      })
      .andWhere('task.id <> :id', { id: task.id });
    if (prev !== null) nextBuilder.andWhere('task.position > :prev', { prev });
    const row = await nextBuilder.getRawOne<{ min: number | null }>();
    const next = row?.min == null ? null : Number(row.min);

    if (prev === null) return next === null ? 0 : next - POSITION_STEP;
    if (next === null) return prev + POSITION_STEP;
    if (next - prev < MIN_GAP) {
      if (!retry) throw new BadRequestException('Không thể sắp xếp task');
      await this.rebalance(manager, task.spaceId!, task.statusId);
      return this.positionAfter(manager, task, afterId, false);
    }
    return (prev + next) / 2;
  }

  async list(workspaceId: number, actorId: number, query: TaskListQuery) {
    const spaceIds = await this.spaceScope(workspaceId, actorId, query.spaceId);
    if (spaceIds?.length === 0)
      return new PageResponse(
        [],
        new PageMetadataResponse({ pageRequest: query, itemCount: 0 }),
      );
    const builder = this.source
      .getRepository(Task)
      .createQueryBuilder('task')
      .where('task.workspaceId = :workspaceId', { workspaceId });
    if (spaceIds)
      builder.andWhere('task.spaceId IN (:...spaceIds)', { spaceIds });
    if (query.search)
      builder.andWhere('task.title ILIKE :search', {
        search: `%${query.search}%`,
      });
    if (query.statusId !== undefined)
      builder.andWhere('task.statusId = :statusId', {
        statusId: query.statusId,
      });
    if (query.assigneeId !== undefined)
      builder.andWhere(
        (qb) =>
          `EXISTS ${qb
            .subQuery()
            .select('1')
            .from(TaskAssigned, 'ta')
            .where('ta.taskId = task.id')
            .andWhere('ta.userId = :assigneeId')
            .getQuery()}`,
        { assigneeId: query.assigneeId },
      );
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
    if (query.sort === 'position') builder.orderBy('task.position', 'ASC');
    const [items, total] = await builder
      .addOrderBy('task.id', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();

    const assigneesByTask = new Map<number, number[]>();
    if (items.length) {
      const assigns = await this.source.getRepository(TaskAssigned).find({
        select: { taskId: true, userId: true },
        where: { taskId: In(items.map((t) => t.id)) },
      });
      for (const a of assigns) {
        const list = assigneesByTask.get(a.taskId) ?? [];
        list.push(a.userId);
        assigneesByTask.set(a.taskId, list);
      }
    }
    const itemsWithAssignees = items.map((task) =>
      Object.assign(task, { assigneeIds: assigneesByTask.get(task.id) ?? [] }),
    );

    return new PageResponse(
      itemsWithAssignees,
      new PageMetadataResponse({ pageRequest: query, itemCount: total }),
    );
  }

  async detail(workspaceId: number, taskId: number, actorId: number) {
    const task = await this.guardedTask(
      this.source.manager,
      workspaceId,
      taskId,
      actorId,
    );
    const assigns = await this.source.getRepository(TaskAssigned).find({
      select: { userId: true },
      where: { taskId: task.id },
    });
    return Object.assign(task, { assigneeIds: assigns.map((a) => a.userId) });
  }

  /** Kiểm tra quyền trên space của task và trả về task (dùng cho comment, assignee) */
  taskAccess(
    manager: EntityManager,
    workspaceId: number,
    taskId: number,
    actorId: number,
    lock = false,
  ) {
    return this.guardedTask(manager, workspaceId, taskId, actorId, { lock });
  }

  async workspaceActivities(
    workspaceId: number,
    actorId: number,
    query: TaskActivityQuery,
  ) {
    const spaceIds = await this.spaceScope(workspaceId, actorId, query.spaceId);
    return this.activity.listByWorkspace(workspaceId, spaceIds, query);
  }

  async activities(
    workspaceId: number,
    taskId: number,
    actorId: number,
    query: TaskPageQuery,
  ) {
    await this.guardedTask(this.source.manager, workspaceId, taskId, actorId, {
      withDeleted: true,
    });
    return this.activity.listByTask(workspaceId, taskId, query);
  }

  async create(
    workspaceId: number,
    actorId: number,
    dto: CreateTaskDto,
    origin?: string,
  ) {
    const created = await this.source.transaction(async (manager) => {
      await this.access.assertSpaceMember(actorId, workspaceId, dto.spaceId, {
        manager,
        lock: true,
      });
      // Không phụ thuộc mã 'todo': trạng thái chưa hoàn thành đầu tiên của space
      const defaultStatus =
        dto.statusId === undefined
          ? await manager.getRepository(TaskStatus).findOne({
              where: { spaceId: dto.spaceId, isCompleted: false },
              order: { displayOrder: 'ASC', id: 'ASC' },
            })
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
        priority: dto.priority ?? DEFAULT_PRIORITY,
        startDate: dto.startDate ?? null,
        dueDate: dto.dueDate ?? null,
        completedAt: null,
        createdBy: actorId,
        updatedBy: actorId,
      });
      const status = await this.validate(manager, task);
      task.position = await this.topPosition(
        manager,
        task.spaceId!,
        task.statusId,
      );
      await repo.save(task);
      const snap = await this.activity.snapshot(manager, task, {
        statusName: status.name,
        assigneeIds: [],
      });
      await this.activity.record(manager, task, actorId, 'created', null, snap);
      return task;
    });
    this.realtime.emit(
      created,
      'task.created',
      { taskId: created.id, statusId: created.statusId, actorId },
      origin,
    );
    return created;
  }

  async update(
    workspaceId: number,
    taskId: number,
    actorId: number,
    dto: UpdateTaskDto,
    origin?: string,
  ) {
    let fromStatusId: number | undefined;
    let changed = false;
    const updated = await this.source.transaction(async (manager) => {
      const task = await this.guardedTask(manager, workspaceId, taskId, actorId, {
        lock: true,
      });
      const before = await this.activity.snapshot(manager, task);
      fromStatusId = task.statusId;
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
      if (!this.activity.diff(before, after).length) return task;
      changed = true;
      // Đổi trạng thái ngoài kanban → đưa task lên đầu cột mới
      if (task.statusId !== fromStatusId)
        task.position = await this.topPosition(
          manager,
          task.spaceId!,
          task.statusId,
          task.id,
        );
      task.updatedBy = actorId;
      await manager.getRepository(Task).save(task);
      await this.activity.record(manager, task, actorId, 'updated', before, after);
      return task;
    });
    if (changed)
      this.realtime.emit(
        updated,
        'task.updated',
        {
          taskId: updated.id,
          statusId: updated.statusId,
          fromStatusId,
          actorId,
        },
        origin,
      );
    return updated;
  }

  /** Kéo thả trên kanban: đổi trạng thái (nếu có) và vị trí trong cột */
  async move(
    workspaceId: number,
    taskId: number,
    actorId: number,
    dto: MoveTaskDto,
    origin?: string,
  ) {
    let fromStatusId: number | undefined;
    const moved = await this.source.transaction(async (manager) => {
      const task = await this.guardedTask(manager, workspaceId, taskId, actorId, {
        lock: true,
      });
      const before = await this.activity.snapshot(manager, task);
      fromStatusId = task.statusId;
      task.statusId = dto.statusId;
      const status = await this.validate(manager, task);
      task.position = await this.positionAfter(
        manager,
        task,
        dto.afterId ?? null,
      );
      task.updatedBy = actorId;
      await manager.getRepository(Task).save(task);
      // Chỉ đổi thứ tự thì không ghi lịch sử
      const after = await this.activity.snapshot(manager, task, {
        statusName: status.name,
      });
      if (this.activity.diff(before, after).length)
        await this.activity.record(
          manager,
          task,
          actorId,
          'updated',
          before,
          after,
        );
      return task;
    });
    this.realtime.emit(
      moved,
      'task.moved',
      { taskId: moved.id, statusId: moved.statusId, fromStatusId, actorId },
      origin,
    );
    return moved;
  }

  async remove(
    workspaceId: number,
    taskId: number,
    actorId: number,
    origin?: string,
  ) {
    const removed = await this.source.transaction(async (manager) => {
      const task = await this.guardedTask(manager, workspaceId, taskId, actorId, {
        lock: true,
      });
      const before = await this.activity.snapshot(manager, task);
      task.deletedBy = actorId;
      task.updatedBy = actorId;
      task.deletedAt = new Date();
      await manager.getRepository(Task).save(task);
      await this.activity.record(manager, task, actorId, 'deleted', before);
      return task;
    });
    this.realtime.emit(
      removed,
      'task.deleted',
      { taskId: removed.id, statusId: removed.statusId, actorId },
      origin,
    );
    return { id: removed.id, deletedAt: removed.deletedAt };
  }
}
