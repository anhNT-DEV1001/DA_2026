import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { AuthUser } from '../../auth/dtos/index.js';
import { WorkspaceAccessService } from '../services/workspace-access.service.js';

/** Route dạng ':id/spaces/:spaceId': owner workspace hoặc thành viên của space */
@Injectable()
export class SpaceGuard implements CanActivate {
  constructor(private readonly access: WorkspaceAccessService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authUser: AuthUser | undefined = request.user;
    const userId = authUser?.user?.id;

    if (!userId) {
      throw new ForbiddenException(
        'Không tìm thấy thông tin người dùng trong phiên làm việc.',
      );
    }

    const { id, spaceId } = request.params;

    if (!spaceId) {
      return true;
    }

    await this.access.assertSpaceMember(userId, Number(id), Number(spaceId));
    return true;
  }
}
