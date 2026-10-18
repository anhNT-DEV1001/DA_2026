import { Injectable } from '@nestjs/common';
import { WebsocketGateway, topicRoom, userRoom } from './gateways/index.js';
import { RealtimeEnvelope } from './interfaces/index.js';

@Injectable()
export class WebsocketService {
  constructor(private gateway: WebsocketGateway) {}

  /** Gửi tới mọi thiết bị đang online của user */
  toUser<T>(userId: number | string, channel: string, event: string, data: T) {
    const envelope: RealtimeEnvelope<T> = {
      channel,
      event,
      data,
      ts: new Date().toISOString(),
    };
    this.gateway.server.to(userRoom(userId)).emit('message', envelope);
  }

  /** Gửi tới các client đã subscribe topic, ví dụ 'order:123' */
  toTopic<T>(topic: string, event: string, data: T) {
    const envelope: RealtimeEnvelope<T> = {
      channel: topic,
      event,
      data,
      ts: new Date().toISOString(),
    };
    this.gateway.server.to(topicRoom(topic)).emit('message', envelope);
  }
}
