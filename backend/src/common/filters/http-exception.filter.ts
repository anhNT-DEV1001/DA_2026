import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorResponse } from '../responses/api.response.js';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Lỗi máy chủ nội bộ';
    let error = 'Internal Server Error';

    // 1. Trường hợp là HttpException chuẩn của NestJS (NotFound, BadRequest, Forbidden...)
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        // NestJS thường trả về object dạng { statusCode, message, error }
        // Khi dùng class-validator, message thường là một mảng chuỗi
        const resObj = res as Record<string, any>;
        message = resObj.message || message;
        error = resObj.error || exception.name;
      }
    } else if (exception instanceof Error) {
      // 2. Trường hợp là lỗi code chưa lường trước (Unhandled Error / 500)
      this.logger.error(
        `[${request.method}] ${request.url} - ${exception.message}`,
        exception.stack,
      );
    }

    // 3. Khởi tạo instance từ class ErrorResponse đã tạo
    const errorResponse = new ErrorResponse(
      status,
      message,
      error,
      request.url,
    );

    // 4. Trả về response JSON
    response.status(status).json(errorResponse);
  }
}
