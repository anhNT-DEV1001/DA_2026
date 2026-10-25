import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { TaskActivity } from '../entities/task-activity.entity.js';
import { Task } from '../entities/task.entity.js';
import { TaskAssigned } from '../entities/task-assigned.entity.js';
import { TaskPageQuery } from '../dtos/task.dto.js';
import {
  PageMetadataResponse,
  PageResponse,
} from '../../../common/responses/paginate.response.js';

export interface TaskSnapshot {
  title: string;
  description: string | null;
  statusId: number;
  /** Denormalized — preserved even if the status is later renamed/deleted. */
  statusName: string | null;
  priority: string;
  startDate: string | null;
  dueDate: string | null;
  completedAt: string | null;
  /** Sorted assignee user IDs at the time of the snapshot. */
  assigneeIds: number[];
}

export type TaskChangedField = keyof Omit<TaskSnapshot, never>;

@Injectable()
export class TaskActivityService {
  constructor(private readonly source: DataSource) {}

  /**
   * Build a snapshot of a task's current state.
   * `statusName` and `assigneeIds` are fetched from the DB when not provided.
   */
  async snapshot(
    manager: EntityManager,
    task: Task,
    opts?: { statusName?: string | null; assigneeIds?: number[] },
  ): Promise<TaskSnapshot> {
    const statusName =
      opts?.statusName !== undefined
        ? opts.statusName
        : await manager
            .getRepository('task_statuses')
            .createQueryBuilder('s')
            .select('s.name')
            .where('s.id = :id', { id: task.statusId })
            .getRawOne<{ s_name: string }>()
            .then((r) => r?.s_name ?? null);

    const assigneeIds: number[] =
      opts?.assigneeIds ??
      await manager
        .getRepository(TaskAssigned)
        .find({ select: { userId: true }, where: { taskId: task.id } })
        .then((rows) => rows.map((r) => r.userId).sort((a, b) => a - b));

    return {
      title: task.title,
      description: task.description,
      statusId: task.statusId,
      statusName: statusName ?? null,
      priority: task.priority,
      startDate: task.startDate,
      dueDate: task.dueDate,
      completedAt: task.completedAt?.toISOString() ?? null,
      assigneeIds,
    };
  }

  /**
   * Compare two snapshots and return the list of field names that changed.
   * For `assigneeIds` arrays, comparison is order-insensitive.
   */
  diff(
    before: TaskSnapshot | Record<string, unknown> | null,
    after: TaskSnapshot | Record<string, unknown> | null,
  ): string[] {
    if (!before || !after) return [];
    const keys = new Set([
      ...Object.keys(before),
      ...Object.keys(after),
    ]);
    return [...keys].filter((key) => {
      const a = (before as Record<string, unknown>)[key];
      const b = (after as Record<string, unknown>)[key];
      if (Array.isArray(a) && Array.isArray(b))
        return JSON.stringify([...a].sort()) !== JSON.stringify([...b].sort());
      return JSON.stringify(a) !== JSON.stringify(b);
    });
  }

  /** Persist one activity log row inside an existing transaction. */
  async record(
    manager: EntityManager,
    task: Task,
    actorId: number,
    action: TaskActivity['action'],
    before: TaskSnapshot | null,
    after?: TaskSnapshot | null,
  ): Promise<void> {
    const afterSnapshot =
      action === 'deleted'
        ? null
        : (after ?? (await this.snapshot(manager, task)));

    const repo = manager.getRepository(TaskActivity);
    const entry = new TaskActivity();
    entry.taskId = task.id;
    entry.actorId = actorId;
    entry.action = action;
    entry.before = before as Record<string, unknown> | null;
    entry.after = afterSnapshot as Record<string, unknown> | null;
    await repo.save(entry);
  }

  async listByTask(
    workspaceId: number,
    taskId: number,
    query: TaskPageQuery,
  ) {
    const [items, total] = await this.source
      .getRepository(TaskActivity)
      .createQueryBuilder('a')
      .innerJoin('a.task', 't', 't.workspaceId = :workspaceId AND t.id = :taskId', {
        workspaceId,
        taskId,
      })
      .withDeleted()
      .orderBy('a.id', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();

    return new PageResponse(
      items,
      new PageMetadataResponse({ pageRequest: query, itemCount: total }),
    );
  }

  async listByWorkspace(workspaceId: number, query: TaskPageQuery) {
    const [items, total] = await this.source
      .getRepository(TaskActivity)
      .createQueryBuilder('a')
      .withDeleted()
      .innerJoin('a.task', 't', 't.workspaceId = :workspaceId', { workspaceId })
      .orderBy('a.id', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();

    return new PageResponse(
      items,
      new PageMetadataResponse({ pageRequest: query, itemCount: total }),
    );
  }
}
