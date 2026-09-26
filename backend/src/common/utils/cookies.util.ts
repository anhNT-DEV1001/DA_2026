import { ConfigService } from '@nestjs/config';
import type { CookieOptions, Response } from 'express';

export function setAuthCookies(
  response: Response,
  accessToken: string,
  refreshToken: string,
  config: ConfigService,
): void {
  // Xóa cookie cũ ở path '/api/v1' nếu còn sót lại trong trình duyệt để tránh xung đột
  response.clearCookie('accessToken', {
    ...baseCookieOptions(config),
    path: apiPath(config),
  });
  response.cookie('accessToken', accessToken, accessCookieOptions(config));
  response.cookie('refreshToken', refreshToken, refreshCookieOptions(config));
}

export function clearAuthCookies(
  response: Response,
  config: ConfigService,
): void {
  response.clearCookie('accessToken', accessCookieOptions(config));
  // Đồng thời xóa cookie cũ ở path '/api/v1' nếu có
  response.clearCookie('accessToken', {
    ...baseCookieOptions(config),
    path: apiPath(config),
  });
  response.clearCookie('refreshToken', refreshCookieOptions(config));
}

export function accessCookieOptions(config: ConfigService): CookieOptions {
  return {
    ...baseCookieOptions(config),
    path: '/',
  };
}

export function refreshCookieOptions(config: ConfigService): CookieOptions {
  return {
    ...baseCookieOptions(config),
    path: `${apiPath(config)}/auth/refresh`,
  };
}

export function baseCookieOptions(config: ConfigService): CookieOptions {
  return {
    httpOnly: true,
    secure: config.get<string>('NODE_ENV') === 'production',
    sameSite: 'lax' as const,
  };
}

export function apiPath(config: ConfigService): string {
  const prefix = config.get<string>('GLOBAL_PREFIX', 'api/v1');
  return `/${prefix.replace(/^\/+|\/+$/g, '')}`;
}
