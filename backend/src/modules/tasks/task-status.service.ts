import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { TaskStatus } from './entities/task-status.entity.js';

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

@Injectable()
export class TaskStatusService {
  /** Use the workspace transaction so creation cannot leave a partial setup. */
  async ensureDefaultStatuses(
    manager: EntityManager,
    workspaceId: number,
    actorId: number | null,
  ): Promise<void> {
    await manager
      .createQueryBuilder()
      .insert()
      .into(TaskStatus)
      .values(
        DEFAULT_STATUSES.map((status) => ({
          ...status,
          workspaceId,
          createdBy: actorId,
          updatedBy: actorId,
        })),
      )
      .orIgnore()
      .execute();
  }
}
