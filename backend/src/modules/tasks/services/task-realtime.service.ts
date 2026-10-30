import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { WebsocketService } from '../../../infrastructure/websockets/websocket.service.js';
import { ChannelRegistry } from '../../../infrastructure/websockets/registries/index.js';
import { WorkspaceAccessService } from '../../workspaces/services/workspace-access.service.js';

export const TASK_SPACE_CHANNEL = 'task-space';

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
  private readonly logger = new Logger(TaskRealtimeService.name);

  constructor(
    private readonly websocket: WebsocketService,
    private readonly registry: ChannelRegistry,
    private readonly access: WorkspaceAccessService,
  ) {}

  onModuleInit() {
    this.registry.register({
      name: TASK_SPACE_CHANNEL,
      authorize: (userId, param) => this.canAccess(Number(userId), param),
    });
  }

  /** Cùng quyền với API task: owner workspace hoặc thành viên của space */
  private canAccess(userId: number, param?: string) {
    const parts = (param ?? '').split(':');
    if (parts.length !== 2) return Promise.resolve(false);
    const [workspaceId, spaceId] = parts.map(Number);
    return this.access.canAccessSpace(userId, workspaceId, spaceId);
  }

  /** Gọi sau khi membership của user trong workspace thay đổi: rời các space không còn quyền xem */
  async revalidate(userId: number, workspaceId: number) {
    const prefix = `${TASK_SPACE_CHANNEL}:${workspaceId}:`;
    try {
      await this.websocket.pruneTopics(
        userId,
        (topic) =>
          !topic.startsWith(prefix) ||
          this.canAccess(userId, topic.slice(TASK_SPACE_CHANNEL.length + 1)),
      );
    } catch (error) {
      this.logger.warn(
        `Không thể thu hồi realtime của user #${userId}: ${(error as Error).message}`,
      );
    }
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
