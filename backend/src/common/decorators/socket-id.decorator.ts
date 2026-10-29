import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

/** Socket.id của tab gửi request (header `x-socket-id`), dùng để không gửi realtime ngược lại cho chính nó */
export const SocketId = createParamDecorator(
  (_: unknown, context: ExecutionContext): string | undefined => {
    const value = context
      .switchToHttp()
      .getRequest<Request>()
      .headers['x-socket-id'];
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
  },
);
