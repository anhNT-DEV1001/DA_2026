import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { DataSource, EntityManager, In, QueryFailedError } from 'typeorm';
import { TaskAssigned } from '../entities/task-assigned.entity.js';
import { Task } from '../entities/task.entity.js';
import { Workspace } from '../../workspaces/entities/workspace.entity.js';
import { WorkspaceMember } from '../../workspaces/entities/workspace-member.entity.js';
import { AssignTaskDto } from '../dtos/task.dto.js';
import { TaskActivityService } from './task-activity.service.js';

const activeStatuses = ['MS001', 'active'];

@Injectable()
export class TaskAssignedService {
  constructor(
    private readonly source: DataSource,
    private readonly activity: TaskActivityService,
  ) {}

  private async assertWorkspaceMember(
    manager: EntityManager,
    workspaceId: number,
    userId: number,
    label = 'Bạn',
  ) {
    if (!userId) throw new UnauthorizedException();
    const workspace = await manager
      .getRepository(Workspace)
      .findOne({ select: { id: true, ownerId: true }, where: { id: workspaceId } });
    if (!workspace) throw new NotFoundException('Không tìm thấy workspace');
    if (workspace.ownerId === userId) return;
    const member = await manager.getRepository(WorkspaceMember).findOne({
      select: { id: true },
      where: { workspaceId, userId, status: In(activeStatuses) },
    });
    if (!member)
      throw new ForbiddenException(
        `${label} không phải thành viên đang hoạt động trong workspace`,
      );
  }

  private async resolveTask(
    manager: EntityManager,
    workspaceId: number,
    taskId: number,
    lock = false,
  ): Promise<Task> {
    const task = await manager
      .getRepository(Task)
      .findOne({
        where: { id: taskId, workspaceId },
        ...(lock ? { lock: { mode: 'pessimistic_write' as const } } : {}),
      });
    if (!task) throw new NotFoundException('Không tìm thấy task trong workspace');
    return task;
  }

  async listAssignees(workspaceId: number, taskId: number, actorId: number) {
    await this.assertWorkspaceMember(this.source.manager, workspaceId, actorId);
    await this.resolveTask(this.source.manager, workspaceId, taskId);
    return this.source.getRepository(TaskAssigned).find({
      where: { taskId },
      relations: { user: true },
      order: { id: 'ASC' },
    });
  }

  async assign(
    workspaceId: number,
    taskId: number,
    actorId: number,
    dto: AssignTaskDto,
  ) {
    return this.source.transaction(async (manager) => {
      await this.assertWorkspaceMember(manager, workspaceId, actorId);
      const task = await this.resolveTask(manager, workspaceId, taskId, true);

      await this.assertWorkspaceMember(
        manager,
        workspaceId,
        dto.userId,
        'Người dùng được assign',
      );

      const before = await this.activity.snapshot(manager, task);

      const record = manager.getRepository(TaskAssigned).create({
        taskId,
        userId: dto.userId,
        assignedBy: dto.userId === actorId ? null : actorId,
        createdBy: actorId,
        updatedBy: actorId,
      });

      try {
        await manager.getRepository(TaskAssigned).save(record);
      } catch (err) {
        if (
          err instanceof QueryFailedError &&
          (err as any).constraint === 'UQ_task_assigned_task_user'
        ) {
          throw new ConflictException('Người dùng đã được assign vào task này');
        }
        throw err;
      }

      const after = await this.activity.snapshot(manager, task);
      await this.activity.record(manager, task, actorId, 'updated', before, after);
      return record;
    });
  }

  async unassign(
    workspaceId: number,
    taskId: number,
    targetUserId: number,
    actorId: number,
  ) {
    return this.source.transaction(async (manager) => {
      await this.assertWorkspaceMember(manager, workspaceId, actorId);
      const task = await this.resolveTask(manager, workspaceId, taskId, true);

      const record = await manager
        .getRepository(TaskAssigned)
        .findOne({ where: { taskId, userId: targetUserId } });

      if (!record)
        throw new NotFoundException('Người dùng chưa được assign vào task này');

      const before = await this.activity.snapshot(manager, task);
      await manager.getRepository(TaskAssigned).remove(record);
      const after = await this.activity.snapshot(manager, task);
      await this.activity.record(manager, task, actorId, 'updated', before, after);

      return { taskId, userId: targetUserId };
    });
  }
}
