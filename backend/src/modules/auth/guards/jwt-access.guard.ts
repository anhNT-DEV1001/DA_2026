import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import type { Socket } from 'socket.io';
import { IS_PUBLIC_KEY } from '../../../common/decorators/index.js';

@Injectable()
export class JwtAccessGuard extends AuthGuard('jwt-access') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    if (context.getType() === 'ws') {
      const client = context.switchToWs().getClient<Socket>();
      if (client.data?.authPromise) {
        return (client.data.authPromise as Promise<boolean>).then(() =>
          Boolean(client.data?.userId),
        );
      }
      return Boolean(client.data?.userId);
    }

    return super.canActivate(context);
  }
}
