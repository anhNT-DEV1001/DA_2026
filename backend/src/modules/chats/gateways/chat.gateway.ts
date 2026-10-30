import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { SkipThrottle } from '@nestjs/throttler';
import { Socket } from 'socket.io';
import {
  getAllowedOrigins,
  topicRoom,
} from '../../../infrastructure/websockets/gateways/index.js';
import { RealtimeEnvelope } from '../../../infrastructure/websockets/interfaces/index.js';
import { chatTopic } from '../services/chat-realtime.service.js';

/**
 * Sự kiện tạm thời của chat (không lưu DB). Dùng chung namespace và kết nối đã xác thực
 * của WebsocketGateway; cùng cấu hình CORS vì gateway nào khởi tạo trước cũng tạo server.
 */
@SkipThrottle()
@WebSocketGateway({
  namespace: '/realtime',
  cors: { origin: getAllowedOrigins(), credentials: true },
})
export class ChatGateway {
  /** Chỉ chuyển tiếp khi client đã subscribe 'chat:{id}' (tức đã qua kiểm tra quyền) */
  @SubscribeMessage('chat.typing')
  async typing(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { conversationId: number; isTyping?: boolean },
  ) {
    if (client.data?.authPromise) {
      await client.data.authPromise;
    }
    const userId = client.data?.userId;
    if (!userId) return { ok: false, error: 'UNAUTHORIZED' };

    const conversationId = Number(body?.conversationId);
    const room = topicRoom(chatTopic(conversationId));
    if (!Number.isSafeInteger(conversationId) || !client.rooms.has(room))
      return { ok: false, error: 'NOT_SUBSCRIBED' };

    const envelope: RealtimeEnvelope = {
      channel: chatTopic(conversationId),
      event: 'typing',
      data: { conversationId, userId, isTyping: body.isTyping !== false },
      ts: new Date().toISOString(),
    };
    client.to(room).emit('message', envelope);
    return { ok: true };
  }
}
