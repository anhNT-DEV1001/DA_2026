import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Space, SpaceMember, WorkspaceMember } from '../entities/index.js';
import { AddSpaceMemberDto, SpaceMemberRequest } from '../dtos/index.js';
import {
  PageMetadataResponse,
  PageResponse,
} from '../../../common/responses/index.js';

@Injectable()
export class SpaceMemberService {
  constructor(
    @InjectRepository(SpaceMember)
    private readonly spaceMemberRepo: Repository<SpaceMember>,
    @InjectRepository(Space)
    private readonly spaceRepo: Repository<Space>,
    @InjectRepository(WorkspaceMember)
    private readonly workspaceMemberRepo: Repository<WorkspaceMember>,
  ) {}

  /**
   * Kiểm tra space tồn tại và thuộc workspace
   */
  private async getSpaceOrThrow(
    workspaceId: number,
    spaceId: number,
  ): Promise<Space> {
    const space = await this.spaceRepo.findOne({
      where: { id: spaceId, workspaceId },
    });
    if (!space) {
      throw new NotFoundException(
        `Space với ID #${spaceId} không tồn tại trong workspace #${workspaceId}.`,
      );
    }
    return space;
  }

  /**
   * Kiểm tra user là thành viên workspace (status đã active)
   */
  private async getWorkspaceMemberOrThrow(
    workspaceId: number,
    userId: number,
  ): Promise<WorkspaceMember> {
    const wm = await this.workspaceMemberRepo.findOne({
      where: { workspaceId, userId },
    });
    if (!wm) {
      throw new BadRequestException(
        `Người dùng #${userId} chưa là thành viên của workspace #${workspaceId}.`,
      );
    }
    if (wm.status !== 'MS001') {
      throw new BadRequestException(
        `Người dùng #${userId} chưa được phê duyệt vào workspace #${workspaceId}.`,
      );
    }
    return wm;
  }

  /**
   * Lấy danh sách thành viên trong space (có phân trang, tìm kiếm)
   */
  async findAll(
    workspaceId: number,
    spaceId: number,
    query?: SpaceMemberRequest,
  ): Promise<PageResponse<SpaceMember> | SpaceMember[]> {
    await this.getSpaceOrThrow(workspaceId, spaceId);

    const qb = this.spaceMemberRepo
      .createQueryBuilder('sm')
      .leftJoinAndSelect('sm.workspaceMember', 'wm')
      .leftJoinAndSelect('wm.role', 'role')
      .leftJoin('wm.user', 'user')
      .addSelect([
        'user.id',
        'user.username',
        'user.fullName',
        'user.email',
        'user.avatar',
      ])
      .where('sm.spaceId = :spaceId', { spaceId });

    if (query?.search?.trim()) {
      const searchTerm = `%${query.search.trim()}%`;
      qb.andWhere(
        '(user.username ILIKE :search OR user.fullName ILIKE :search OR user.email ILIKE :search)',
        { search: searchTerm },
      );
    }

    qb.orderBy('sm.createdAt', 'DESC');

    if (query && (query.page !== undefined || query.limit !== undefined)) {
      const [items, itemCount] = await qb
        .skip(query.skip)
        .take(query.limit ?? 15)
        .getManyAndCount();

      const meta = new PageMetadataResponse({ pageRequest: query, itemCount });
      return new PageResponse(items, meta);
    }

    return await qb.getMany();
  }

  /**
   * Lấy chi tiết thành viên theo workspaceMemberId trong space
   */
  async findOne(
    workspaceId: number,
    spaceId: number,
    workspaceMemberId: number,
  ): Promise<SpaceMember> {
    await this.getSpaceOrThrow(workspaceId, spaceId);

    const sm = await this.spaceMemberRepo
      .createQueryBuilder('sm')
      .leftJoinAndSelect('sm.workspaceMember', 'wm')
      .leftJoinAndSelect('wm.role', 'role')
      .leftJoin('wm.user', 'user')
      .addSelect([
        'user.id',
        'user.username',
        'user.fullName',
        'user.email',
        'user.avatar',
      ])
      .where(
        'sm.spaceId = :spaceId AND sm.workspaceMemberId = :workspaceMemberId',
        {
          spaceId,
          workspaceMemberId,
        },
      )
      .getOne();

    if (!sm) {
      throw new NotFoundException(
        `Thành viên #${workspaceMemberId} không tồn tại trong space #${spaceId}.`,
      );
    }

    return sm;
  }

  /**
   * Thêm thành viên workspace vào space.
   * User phải là thành viên active của workspace trước.
   */
  async addMember(
    workspaceId: number,
    spaceId: number,
    dto: AddSpaceMemberDto,
    currentUserId?: number,
  ): Promise<SpaceMember> {
    await this.getSpaceOrThrow(workspaceId, spaceId);

    const wm = await this.getWorkspaceMemberOrThrow(workspaceId, dto.userId);

    const existing = await this.spaceMemberRepo.findOne({
      where: { spaceId, workspaceMemberId: wm.id },
    });
    if (existing) {
      throw new BadRequestException(
        `Người dùng #${dto.userId} đã là thành viên của space #${spaceId}.`,
      );
    }

    const newMember = this.spaceMemberRepo.create({
      spaceId,
      workspaceMemberId: wm.id,
      createdBy: currentUserId ?? null,
    });

    const saved = await this.spaceMemberRepo.save(newMember);
    return this.findOne(workspaceId, spaceId, saved.workspaceMemberId);
  }

  /**
   * Lấy danh sách spaces mà user hiện tại đang tham gia trong một workspace
   */
  async findMySpacesInWorkspace(
    workspaceId: number,
    userId: number,
  ): Promise<Space[]> {
    const wm = await this.workspaceMemberRepo.findOne({
      where: { workspaceId, userId },
    });
    if (!wm) return [];

    const spaceMembers = await this.spaceMemberRepo.find({
      where: { workspaceMemberId: wm.id },
      relations: { space: true },
    });

    return spaceMembers
      .map((sm) => sm.space)
      .filter(Boolean)
      .sort((a, b) => (a?.displayOrder ?? 0) - (b?.displayOrder ?? 0));
  }

  /**
   * Xóa thành viên khỏi space
   */
  async removeMember(
    workspaceId: number,
    spaceId: number,
    workspaceMemberId: number,
  ): Promise<{ message: string }> {
    await this.getSpaceOrThrow(workspaceId, spaceId);

    const sm = await this.spaceMemberRepo.findOne({
      where: { spaceId, workspaceMemberId },
    });

    if (!sm) {
      throw new NotFoundException(
        `Thành viên #${workspaceMemberId} không tồn tại trong space #${spaceId}.`,
      );
    }

    await this.spaceMemberRepo.remove(sm);

    return {
      message: `Đã xóa thành viên #${workspaceMemberId} khỏi space #${spaceId} thành công.`,
    };
  }
}
