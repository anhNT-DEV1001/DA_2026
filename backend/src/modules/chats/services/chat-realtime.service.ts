import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { WebsocketService } from '../../../infrastructure/websockets/websocket.service.js';
import { ChannelRegistry } from '../../../infrastructure/websockets/registries/index.js';
import { ChatAccessService } from './chat-access.service.js';

export const CHAT_CHANNEL = 'chat';

/** Gửi tới các client đang mở conversation (đã subscribe topic) */
export type ChatTopicEvent =
  | 'message.created'
  | 'message.updated'
  | 'message.deleted'
  | 'reaction.changed';

/** Gửi tới room riêng của user: cập nhật sidebar/badge kể cả khi không mở conversation */
export type ChatUserEvent =
  | 'conversation.activity'
  | 'conversation.created'
  | 'conversation.read';

/** Topic theo conversation: 'chat:{conversationId}' */
export const chatTopic = (conversationId: number) =>
  `${CHAT_CHANNEL}:${conversationId}`;

@Injectable()
export class ChatRealtimeService implements OnModuleInit {
  private readonly logger = new Logger(ChatRealtimeService.name);

  constructor(
    private readonly websocket: WebsocketService,
    private readonly registry: ChannelRegistry,
    private readonly chatAccess: ChatAccessService,
  ) {}

  onModuleInit() {
    this.registry.register({
      name: CHAT_CHANNEL,
      authorize: (userId, param) =>
        this.chatAccess.canAccess(Number(userId), Number(param)),
    });
  }

  /** Gọi sau khi transaction đã commit; `origin` là socket.id của tab gây ra thay đổi */
  emit(
    conversationId: number,
    event: ChatTopicEvent,
    data: unknown,
    origin?: string,
  ) {
    this.websocket.toTopic(chatTopic(conversationId), event, data, origin);
  }

  toUsers(userIds: number[], event: ChatUserEvent, data: unknown) {
    for (const userId of userIds)
      this.websocket.toUser(userId, CHAT_CHANNEL, event, data);
  }

  /** Gọi sau khi membership của user thay đổi: rời các conversation không còn quyền vào */
  async revalidate(userId: number) {
    const prefix = `${CHAT_CHANNEL}:`;
    try {
      await this.websocket.pruneTopics(
        userId,
        (topic) =>
          !topic.startsWith(prefix) ||
          this.chatAccess.canAccess(userId, Number(topic.slice(prefix.length))),
      );
    } catch (error) {
      this.logger.warn(
        `Không thể thu hồi realtime chat của user #${userId}: ${(error as Error).message}`,
      );
    }
  }
}
