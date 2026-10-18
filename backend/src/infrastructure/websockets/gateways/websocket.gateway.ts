import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { SkipThrottle } from '@nestjs/throttler';
import { InjectRepository } from '@nestjs/typeorm';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { ChannelRegistry } from '../registries/index.js';
import { UserSession } from '../../../modules/auth/entities/index.js';
import { JwtPayload } from '../../../modules/auth/dtos/index.js';
import { UsersService } from '../../../modules/users/users.service.js';

export const userRoom = (userId: number | string) => `user:${userId}`;
export const topicRoom = (topic: string) => `topic:${topic}`;

const getAllowedOrigins = (): string[] => {
  const raw =
    process.env.CORS_ORIGIN ??
    process.env.FRONTEND_URL ??
    'http://localhost:3000';
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
};

@SkipThrottle()
@WebSocketGateway({
  namespace: '/realtime',
  cors: { origin: getAllowedOrigins(), credentials: true },
})
export class WebsocketGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly registry: ChannelRegistry,
    private readonly userService: UsersService,
    @InjectRepository(UserSession)
    private readonly userSessionRepo: Repository<UserSession>,
  ) {}

  private extractAccessToken(client: Socket): string | null {
    // 1. Ưu tiên đọc từ HttpOnly Cookie giống JwtAccessStrategy
    const rawCookie = client.handshake.headers?.cookie;
    if (rawCookie) {
      const matches = [
        ...rawCookie.matchAll(/(?:^|;\s*)accessToken=([^;]+)/g),
      ];
      if (matches.length > 0) {
        return decodeURIComponent(matches[matches.length - 1][1]);
      }
    }

    // 2. Fallback qua handshake.auth.token
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken.trim()) {
      return authToken.replace(/^Bearer\s+/i, '').trim();
    }

    // 3. Fallback qua header Authorization: Bearer <token>
    const authHeader = client.handshake.headers?.authorization;
    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      return authHeader.slice(7).trim();
    }

    return null;
  }

  private async authenticateClient(client: Socket): Promise<boolean> {
    const token = this.extractAccessToken(client);
    if (!token) {
      return false;
    }

    const payload = await this.jwt.verifyAsync<JwtPayload>(token);
    if (!payload?.sub || !payload?.sid) {
      return false;
    }

    const [user, session] = await Promise.all([
      this.userService.getByIdWithRoles(payload.sub),
      this.userSessionRepo.findOne({
        where: {
          userId: payload.sub,
          sid: payload.sid,
        },
      }),
    ]);

    const sessionExpiresAt = session
      ? new Date(session.expiresAt).getTime()
      : Number.NaN;
    if (
      !session ||
      !Number.isFinite(sessionExpiresAt) ||
      sessionExpiresAt <= Date.now() ||
      !user ||
      !user.id
    ) {
      return false;
    }

    client.data.userId = user.id;
    client.data.sessionId = payload.sid;
    client.data.user = user;
    await client.join(userRoom(user.id));
    return true;
  }

  async handleConnection(client: Socket) {
    try {
      const authPromise = this.authenticateClient(client);
      client.data.authPromise = authPromise;
      const isAuthenticated = await authPromise;
      if (!isAuthenticated) {
        client.disconnect();
      }
    } catch {
      client.disconnect();
    }
  }

  @SubscribeMessage('subscribe')
  async subscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { topic: string },
  ) {
    if (client.data?.authPromise) {
      await client.data.authPromise;
    }
    if (!client.data?.userId) {
      return { ok: false, error: 'UNAUTHORIZED' };
    }

    const [name, ...rest] = body.topic.split(':');
    const param = rest.join(':') || undefined;

    const def = this.registry.get(name);
    if (!def) return { ok: false, error: 'UNKNOWN_CHANNEL' };

    if (def.authorize) {
      const allowed = await def.authorize(client.data.userId, param);
      if (!allowed) return { ok: false, error: 'FORBIDDEN' };
    }

    await client.join(topicRoom(body.topic));
    return { ok: true };
  }

  @SubscribeMessage('unsubscribe')
  async unsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { topic: string },
  ) {
    await client.leave(topicRoom(body.topic));
    return { ok: true };
  }
}
