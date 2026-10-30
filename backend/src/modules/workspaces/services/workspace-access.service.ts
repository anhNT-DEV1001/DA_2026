import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { DataSource, EntityManager, In } from 'typeorm';
import {
  Space,
  SpaceMember,
  Workspace,
  WorkspaceMember,
} from '../entities/index.js';

/** Trạng thái thành viên được coi là đang hoạt động ('active' là default cũ của cột) */
export const ACTIVE_MEMBER_STATUSES = ['MS001', 'active'];

export interface AccessOptions {
  /** Chạy trong transaction đang mở */
  manager?: EntityManager;
  /** Giữ khoá đọc trên dòng membership tới hết transaction, chặn việc bị xoá giữa chừng */
  lock?: boolean;
  /** Chủ ngữ trong thông báo lỗi, vd: 'Người dùng được assign' */
  label?: string;
}

/**
 * Quy tắc truy cập dùng chung cho HTTP và realtime:
 * - Workspace: owner hoặc thành viên đang hoạt động.
 * - Space: owner workspace, hoặc thành viên đang hoạt động của workspace và có trong space-members.
 */
@Injectable()
export class WorkspaceAccessService {
  constructor(private readonly source: DataSource) {}

  private positiveId(id: number) {
    if (!Number.isSafeInteger(id) || id < 1)
      throw new BadRequestException('ID phải là số nguyên dương');
  }

  async assertWorkspaceMember(
    userId: number,
    workspaceId: number,
    { manager = this.source.manager, lock = false, label = 'Bạn' }: AccessOptions = {},
  ) {
    this.positiveId(workspaceId);
    if (!userId) throw new UnauthorizedException();
    const lockOption = lock ? { lock: { mode: 'pessimistic_read' as const } } : {};
    const workspace = await manager.getRepository(Workspace).findOne({
      select: { id: true, ownerId: true },
      where: { id: workspaceId },
      ...lockOption,
    });
    if (!workspace) throw new NotFoundException('Không tìm thấy workspace');
    const isOwner = workspace.ownerId === userId;
    if (!isOwner) {
      const member = await manager.getRepository(WorkspaceMember).findOne({
        select: { id: true },
        where: { workspaceId, userId, status: In(ACTIVE_MEMBER_STATUSES) },
        ...lockOption,
      });
      if (!member)
        throw new ForbiddenException(
          `${label} không phải thành viên đang hoạt động trong workspace`,
        );
    }
    return { workspace, isOwner };
  }

  async assertSpaceMember(
    userId: number,
    workspaceId: number,
    spaceId: number,
    options: AccessOptions = {},
  ) {
    const { manager = this.source.manager, lock = false, label = 'Bạn' } = options;
    const { isOwner } = await this.assertWorkspaceMember(userId, workspaceId, options);
    this.positiveId(spaceId);
    const space = await manager.getRepository(Space).exists({
      where: { id: spaceId, workspaceId },
    });
    if (!space) throw new NotFoundException('Không tìm thấy space trong workspace');
    if (isOwner) return;

    const builder = manager
      .getRepository(SpaceMember)
      .createQueryBuilder('sm')
      .innerJoin('sm.workspaceMember', 'wm')
      .select('sm.id')
      .where('sm.spaceId = :spaceId', { spaceId })
      .andWhere('wm.workspaceId = :workspaceId AND wm.userId = :userId', {
        workspaceId,
        userId,
      })
      .andWhere('wm.status IN (:...statuses)', {
        statuses: ACTIVE_MEMBER_STATUSES,
      });
    if (lock) builder.setLock('pessimistic_read', undefined, ['sm']);
    if (!(await builder.getOne()))
      throw new ForbiddenException(`${label} không phải thành viên của space này`);
  }

  /** Dạng boolean của assertSpaceMember, dùng cho authorize của kênh realtime */
  async canAccessSpace(userId: number, workspaceId: number, spaceId: number) {
    try {
      await this.assertSpaceMember(userId, workspaceId, spaceId);
      return true;
    } catch {
      return false;
    }
  }

  /** Các space user được xem trong workspace; null = owner, xem được tất cả. Gọi sau assertWorkspaceMember */
  async accessibleSpaceIds(
    userId: number,
    workspaceId: number,
    manager: EntityManager = this.source.manager,
  ): Promise<number[] | null> {
    const workspace = await manager.getRepository(Workspace).findOne({
      select: { id: true, ownerId: true },
      where: { id: workspaceId },
    });
    if (workspace?.ownerId === userId) return null;
    const rows = await manager
      .getRepository(SpaceMember)
      .createQueryBuilder('sm')
      .innerJoin('sm.workspaceMember', 'wm')
      .innerJoin('sm.space', 's')
      .select('sm.spaceId', 'spaceId')
      .where('s.workspaceId = :workspaceId AND s.deletedAt IS NULL', {
        workspaceId,
      })
      .andWhere('wm.workspaceId = :workspaceId AND wm.userId = :userId', {
        workspaceId,
        userId,
      })
      .andWhere('wm.status IN (:...statuses)', {
        statuses: ACTIVE_MEMBER_STATUSES,
      })
      .getRawMany<{ spaceId: number }>();
    return rows.map((row) => Number(row.spaceId));
  }
}
