import { SetMetadata } from '@nestjs/common';

export const PERMISSION_KEY = 'permission';

/**
 * Decorator yêu cầu quyền hạn (permission code) để truy cập route.
 * @param permissions Mã quyền hoặc danh sách mã quyền (ví dụ: 'USER_CREATE', 'ROLE_VIEW')
 */
export const HasPermission = (...permissions: string[]) => {
  const permission = permissions.length === 1 ? permissions[0] : permissions;
  return SetMetadata(PERMISSION_KEY, permission);
};
