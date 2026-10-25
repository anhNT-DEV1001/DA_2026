import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthUser } from '../../auth/dtos/index.js';
import { Space, SpaceMember } from '../entities/index.js';

@Injectable()
export class SpaceGuard implements CanActivate {
  constructor(
    @InjectRepository(Space)
    private readonly spaceRepo: Repository<Space>,
    @InjectRepository(SpaceMember)
    private readonly spaceMemberRepo: Repository<SpaceMember>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authUser: AuthUser | undefined = request.user;
    const userId = authUser?.user?.id;

    if (!userId) {
      throw new ForbiddenException(
        'Không tìm thấy thông tin người dùng trong phiên làm việc.',
      );
    }

    const { spaceId } = request.params;

    if (!spaceId) {
      return true;
    }

    // 1. Kiểm tra space có tồn tại không, load kèm workspace để kiểm tra owner
    const space = await this.spaceRepo.findOne({
      where: { id: Number(spaceId) },
      relations: { workspace: true },
    });

    if (!space) {
      throw new NotFoundException('Không tìm thấy space.');
    }

    // 2. Workspace owner có toàn quyền
    if (space.workspace.ownerId === userId) {
      return true;
    }

    // 3. Kiểm tra user có phải space member không
    // SpaceMember.workspaceMember.userId = userId AND SpaceMember.spaceId = spaceId
    const isMember = await this.spaceMemberRepo
      .createQueryBuilder('sm')
      .innerJoin(
        'sm.workspaceMember',
        'wm',
        'wm.userId = :userId AND wm.status = :status',
        { userId, status: 'MS001' },
      )
      .where('sm.spaceId = :spaceId', { spaceId: Number(spaceId) })
      .getExists();

    if (!isMember) {
      throw new ForbiddenException(
        'Bạn không phải là thành viên của space này.',
      );
    }

    return true;
  }
}
