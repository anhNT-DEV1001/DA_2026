import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, QueryFailedError } from 'typeorm';
import { TaskAssigned } from '../entities/task-assigned.entity.js';
import { WorkspaceAccessService } from '../../workspaces/services/workspace-access.service.js';
import { AssignTaskDto } from '../dtos/task.dto.js';
import { TaskActivityService } from './task-activity.service.js';
import { TaskRealtimeService } from './task-realtime.service.js';
import { TasksService } from './tasks.service.js';

@Injectable()
export class TaskAssignedService {
  constructor(
    private readonly source: DataSource,
    private readonly activity: TaskActivityService,
    private readonly realtime: TaskRealtimeService,
    private readonly tasks: TasksService,
    private readonly access: WorkspaceAccessService,
  ) {}

  async listAssignees(workspaceId: number, taskId: number, actorId: number) {
    await this.tasks.taskAccess(this.source.manager, workspaceId, taskId, actorId);
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
    origin?: string,
  ) {
    const { task, record } = await this.source.transaction(async (manager) => {
      const task = await this.tasks.taskAccess(
        manager,
        workspaceId,
        taskId,
        actorId,
        true,
      );
      // Người được assign phải xem được task, tức là thuộc space của task
      const assignee = { manager, label: 'Người dùng được assign' };
      if (task.spaceId)
        await this.access.assertSpaceMember(
          dto.userId,
          workspaceId,
          task.spaceId,
          assignee,
        );
      else
        await this.access.assertWorkspaceMember(dto.userId, workspaceId, assignee);

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
      return { task, record };
    });
    this.realtime.emit(
      task,
      'task.assignees_changed',
      { taskId, actorId },
      origin,
    );
    return record;
  }

  async unassign(
    workspaceId: number,
    taskId: number,
    targetUserId: number,
    actorId: number,
    origin?: string,
  ) {
    const task = await this.source.transaction(async (manager) => {
      const task = await this.tasks.taskAccess(
        manager,
        workspaceId,
        taskId,
        actorId,
        true,
      );

      const record = await manager
        .getRepository(TaskAssigned)
        .findOne({ where: { taskId, userId: targetUserId } });

      if (!record)
        throw new NotFoundException('Người dùng chưa được assign vào task này');

      const before = await this.activity.snapshot(manager, task);
      await manager.getRepository(TaskAssigned).remove(record);
      const after = await this.activity.snapshot(manager, task);
      await this.activity.record(manager, task, actorId, 'updated', before, after);
      return task;
    });
    this.realtime.emit(
      task,
      'task.assignees_changed',
      { taskId, actorId },
      origin,
    );
    return { taskId, userId: targetUserId };
  }
}
