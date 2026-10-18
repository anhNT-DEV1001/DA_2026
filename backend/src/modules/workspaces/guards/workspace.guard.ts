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
import { Workspace } from '../entities/index.js';

@Injectable()
export class WorkspaceGuard implements CanActivate {
  constructor(
    @InjectRepository(Workspace)
    private readonly workspaceRepo: Repository<Workspace>,
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

    const { slug, id } = request.params;

    // 1. Kiểm tra workspace có tồn tại hay không
    const qb = this.workspaceRepo.createQueryBuilder('ws');
    if (slug) {
      qb.where('ws.slug = :slug', { slug });
    } else if (id) {
      qb.where('ws.id = :id', { id: Number(id) });
    } else {
      return true;
    }

    const workspace = await qb.getOne();
    if (!workspace) {
      throw new NotFoundException(
        slug ? `Không tìm thấy workspace.` : `Không tìm thấy workspace.`,
      );
    }

    // 2. Nếu user hiện tại là Owner -> Cho phép truy cập ngay
    if (workspace.ownerId === userId) {
      return true;
    }

    // 3. Kiểm tra user có phải là thành viên chính thức (MS001 / active) hay không
    const isMember = await this.workspaceRepo
      .createQueryBuilder('ws')
      .innerJoin(
        'ws.members',
        'member',
        'member.userId = :userId AND member.status IN (:...statuses)',
        {
          userId,
          statuses: ['MS001'], // Chỉ kiểm tra các thành viên có trạng thái active (MS001)
        },
      )
      .where('ws.id = :workspaceId', { workspaceId: workspace.id })
      .getExists();

    if (!isMember) {
      throw new ForbiddenException(
        'Bạn không phải là chủ sở hữu hoặc thành viên của workspace này.',
      );
    }

    return true;
  }
}
