export class SuccessResponse<T> {
  statusCode: number;
  success: boolean;
  message: string;
  data: T;
  timestamp: string;

  constructor(
    data: T,
    message: string = 'Thành công',
    statusCode: number = 200,
  ) {
    this.statusCode = statusCode;
    this.success = true;
    this.message = message;
    this.data = data;
    this.timestamp = new Date().toISOString();
  }
}

export class ErrorResponse {
  statusCode: number;
  success: boolean;
  message: string | string[];
  error: string;
  path?: string;
  timestamp: string;

  constructor(
    statusCode: number,
    message: string | string[],
    error: string = 'Bad Request',
    path?: string,
  ) {
    this.statusCode = statusCode;
    this.success = false;
    this.message = message;
    this.error = error;
    this.path = path;
    this.timestamp = new Date().toISOString();
  }
}
