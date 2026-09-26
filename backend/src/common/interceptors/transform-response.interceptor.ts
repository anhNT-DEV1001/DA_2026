import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Response } from 'express';
import { SuccessResponse } from '../responses/api.response.js';
import { RESPONSE_MESSAGE_KEY } from '../decorators/response-message.decorator.js';

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  SuccessResponse<T>
> {
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<SuccessResponse<T>> {
    const response = context.switchToHttp().getResponse<Response>();
    const statusCode = response.statusCode;

    // Lấy message từ decorator @ResponseMessage() nếu có, mặc định là 'Thành công'
    const customMessage =
      this.reflector.getAllAndOverride<string>(RESPONSE_MESSAGE_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) || 'Thành công';

    return next.handle().pipe(
      map((data) => {
        // Khởi tạo đối tượng SuccessResponse chuẩn hóa
        return new SuccessResponse<T>(data, customMessage, statusCode);
      }),
    );
  }
}
