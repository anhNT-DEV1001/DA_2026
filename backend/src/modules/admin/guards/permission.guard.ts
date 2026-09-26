import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSION_KEY } from '../../../common/decorators/index.js';
import { AuthUser } from '../../auth/dtos/index.js';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<
      string | string[]
    >(PERMISSION_KEY, [context.getHandler(), context.getClass()]);

    if (!requiredPermissions) {
      return true;
    }

    const permissions = Array.isArray(requiredPermissions)
      ? requiredPermissions
      : [requiredPermissions];

    if (permissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authUser: AuthUser = request.user;

    if (!authUser || !authUser.user) {
      throw new ForbiddenException(
        'Không tìm thấy thông tin người dùng trong phiên làm việc.',
      );
    }

    const user = authUser.user;

    for (const code of permissions) {
      let hasPermission = false;

      // 1. Kiểm tra đối tượng user của AuthUser có phương thức hasPermission hay không và gọi xử lý
      if (typeof user.hasPermission === 'function') {
        hasPermission = user.hasPermission(code);
      }

      // 2. Dự phòng: nếu user.hasPermission chưa trả về true (do relations chưa nạp đủ trên user),
      // kiểm tra trong danh sách permissions đã được AuthorizeService nạp đầy đủ trong AuthUser
      if (!hasPermission && Array.isArray(authUser.permissions)) {
        hasPermission = authUser.permissions.some((p) => p.code === code);
      }

      if (!hasPermission) {
        throw new ForbiddenException(
          `Bạn không có quyền thực hiện chức năng này (yêu cầu quyền: ${code}).`,
        );
      }
    }

    return true;
  }
}
