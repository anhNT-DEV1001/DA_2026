import { Injectable, OnModuleInit } from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import { Space, Workspace, WorkspaceMember } from '../../workspaces/entities/index.js';
import { WebsocketService } from '../../../infrastructure/websockets/websocket.service.js';
import { ChannelRegistry } from '../../../infrastructure/websockets/registries/index.js';

export const TASK_SPACE_CHANNEL = 'task-space';

const activeStatuses = ['MS001', 'active'];

export type TaskRealtimeEvent =
  | 'task.created'
  | 'task.updated'
  | 'task.moved'
  | 'task.deleted'
  | 'task.assignees_changed'
  | 'comment.created'
  | 'comment.updated'
  | 'comment.deleted'
  | 'status.changed';

/** Topic theo space: 'task-space:{workspaceId}:{spaceId}' */
export const taskSpaceTopic = (workspaceId: number, spaceId: number) =>
  `${TASK_SPACE_CHANNEL}:${workspaceId}:${spaceId}`;

/** Đẩy thay đổi của task/comment/trạng thái tới các client đang xem cùng space */
@Injectable()
export class TaskRealtimeService implements OnModuleInit {
  constructor(
    private readonly source: DataSource,
    private readonly websocket: WebsocketService,
    private readonly registry: ChannelRegistry,
  ) {}

  onModuleInit() {
    this.registry.register({
      name: TASK_SPACE_CHANNEL,
      authorize: (userId, param) => this.canAccess(Number(userId), param),
    });
  }

  /** Giống quyền xem task qua API: owner hoặc thành viên active của workspace, space thuộc workspace */
  private async canAccess(userId: number, param?: string) {
    const [workspaceId, spaceId] = (param ?? '').split(':').map(Number);
    if (
      !Number.isSafeInteger(workspaceId) ||
      !Number.isSafeInteger(spaceId) ||
      workspaceId < 1 ||
      spaceId < 1
    )
      return false;

    const [workspace, spaceExists] = await Promise.all([
      this.source.getRepository(Workspace).findOne({
        select: { id: true, ownerId: true },
        where: { id: workspaceId },
      }),
      this.source
        .getRepository(Space)
        .existsBy({ id: spaceId, workspaceId }),
    ]);
    if (!workspace || !spaceExists) return false;
    if (workspace.ownerId === userId) return true;
    return this.source.getRepository(WorkspaceMember).existsBy({
      workspaceId,
      userId,
      status: In(activeStatuses),
    });
  }

  /** Gọi sau khi transaction đã commit; `origin` là socket.id của tab gây ra thay đổi */
  emit(
    target: { workspaceId: number; spaceId: number | null },
    event: TaskRealtimeEvent,
    data: Record<string, unknown>,
    origin?: string,
  ) {
    if (!target.spaceId) return;
    this.websocket.toTopic(
      taskSpaceTopic(target.workspaceId, target.spaceId),
      event,
      data,
      origin,
    );
  }
}
