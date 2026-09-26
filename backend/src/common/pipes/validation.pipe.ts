import {
  ValidationPipe,
  ValidationError,
  BadRequestException,
  ValidationPipeOptions,
} from '@nestjs/common';

export class CustomValidationPipe extends ValidationPipe {
  constructor(options?: ValidationPipeOptions) {
    super({
      whitelist: true, // Loại bỏ các trường không được định nghĩa trong DTO
      forbidNonWhitelisted: true, // Báo lỗi nếu gửi lên trường không hợp lệ
      transform: true, // Tự động ép kiểu dữ liệu theo DTO
      ...options,
      exceptionFactory: (errors: ValidationError[]) => {
        const message = this.extractFirstErrorMessage(errors);
        return new BadRequestException(message);
      },
    });
  }

  /**
   * Hàm đệ quy duyệt qua các tầng lỗi để lấy câu thông báo đầu tiên
   * (Xử lý được cả DTO đơn giản lẫn DTO lồng nhau - nested object)
   */
  private extractFirstErrorMessage(errors: ValidationError[]): string {
    if (!errors || errors.length === 0) {
      return 'Dữ liệu không hợp lệ';
    }

    const firstError = errors[0];

    // Nếu lỗi nằm ngay tại thuộc tính hiện tại
    if (firstError.constraints) {
      const constraintMessages = Object.values(firstError.constraints);
      return constraintMessages[0];
    }

    // Nếu là object lồng nhau (nested DTO), tiếp tục đệ quy vào children
    if (firstError.children && firstError.children.length > 0) {
      return this.extractFirstErrorMessage(firstError.children);
    }

    return 'Dữ liệu không hợp lệ';
  }
}
