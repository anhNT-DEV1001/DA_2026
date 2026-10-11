import { ThrottlerModuleOptions } from '@nestjs/throttler';

export const throttlerConfig: ThrottlerModuleOptions = {
  throttlers: [
    {
      name: 'short',
      ttl: 1000, // 1s
      limit: 3, // 3 requests/giây
    },
    {
      name: 'medium',
      ttl: 10000, // 10s
      limit: 20, // 20 requests/10s
    },
    {
      name: 'long',
      ttl: 60000, // 1m
      limit: 100, // 100 requests/phút
    },
  ],
  // Có thể thêm custom error message nếu muốn:
  errorMessage: 'Quá nhiều yêu cầu, vui lòng thử lại sau!',
};
