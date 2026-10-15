import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Workspace, WorkspaceMember } from '../entities/index.js';
import { Role } from '../../admin/entites/index.js';
import { UsersService } from '../../users/users.service.js';
import {
  AddWorkspaceMemberDto,
  UpdateWorkspaceMemberDto,
  WorkspaceMemberRequest,
} from '../dtos/index.js';
import {
  PageMetadataResponse,
  PageResponse,
} from '../../../common/responses/index.js';

@Injectable()
export class WorkspaceMemberService {
  constructor(
    @InjectRepository(WorkspaceMember)
    private readonly workmemRepo: Repository<WorkspaceMember>,
    @InjectRepository(Workspace)
    private readonly workspaceRepo: Repository<Workspace>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    private readonly userService: UsersService,
  ) {}

  /**
   * Lấy danh sách thành viên trong workspace:
   * Hỗ trợ tìm kiếm, lọc theo vai trò (role) / trạng thái (status),
   * phân trang và join tới bảng User & Role.
   */
  async findAll(
    workspaceId: number,
    query?: WorkspaceMemberRequest,
  ): Promise<PageResponse<WorkspaceMember> | WorkspaceMember[]> {
    // Kiểm tra xem workspace có tồn tại hay không
    const workspaceExists = await this.workspaceRepo.exists({
      where: { id: workspaceId },
    });
    if (!workspaceExists) {
      throw new NotFoundException(
        `Workspace với ID #${workspaceId} không tồn tại.`,
      );
    }

    const qb = this.workmemRepo
      .createQueryBuilder('wm')
      // Join tới bảng Role
      .leftJoinAndSelect('wm.role', 'role')
      // Join tới bảng User (chỉ lấy các trường an toàn, không lấy password)
      .leftJoin('wm.user', 'user')
      .addSelect([
        'user.id',
        'user.username',
        'user.fullName',
        'user.email',
        'user.phone',
        'user.avatar',
        'user.gender',
        'user.address',
        'user.dob',
        'user.createdAt',
      ])
      .where('wm.workspaceId = :workspaceId', { workspaceId });

    // Lọc theo vai trò (roleId)
    if (query?.roleId) {
      qb.andWhere('wm.roleId = :roleId', { roleId: query.roleId });
    }

    // Lọc theo trạng thái thành viên (status)
    if (query?.status) {
      qb.andWhere('wm.status = :status', { status: query.status });
    }

    // Lọc tìm kiếm theo username, fullName hoặc email của người dùng
    if (query?.search?.trim()) {
      const searchTerm = `%${query.search.trim()}%`;
      qb.andWhere(
        '(user.username ILIKE :search OR user.fullName ILIKE :search OR user.email ILIKE :search)',
        { search: searchTerm },
      );
    }

    qb.orderBy('wm.joinedAt', 'DESC').addOrderBy('wm.createdAt', 'DESC');

    // Phân trang nếu có truyền page hoặc limit
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
   * Alias tương thích ngược để lấy danh sách thành viên trong workspace
   */
  async getWorkspaceMember(
    workspaceId: number,
    query?: WorkspaceMemberRequest,
  ): Promise<PageResponse<WorkspaceMember> | WorkspaceMember[]> {
    return this.findAll(workspaceId, query);
  }

  /**
   * Lấy chi tiết thông tin một thành viên trong workspace
   */
  async findOne(workspaceId: number, userId: number): Promise<WorkspaceMember> {
    const member = await this.workmemRepo
      .createQueryBuilder('wm')
      .leftJoinAndSelect('wm.role', 'role')
      .leftJoin('wm.user', 'user')
      .addSelect([
        'user.id',
        'user.username',
        'user.fullName',
        'user.email',
        'user.phone',
        'user.avatar',
        'user.gender',
        'user.address',
        'user.dob',
        'user.createdAt',
      ])
      .where('wm.workspaceId = :workspaceId AND wm.userId = :userId', {
        workspaceId,
        userId,
      })
      .getOne();

    if (!member) {
      throw new NotFoundException(
        `Thành viên với User ID #${userId} không tồn tại trong workspace #${workspaceId}.`,
      );
    }

    return member;
  }

  /**
   * Thêm mới thành viên vào workspace
   */
  async addMember(
    workspaceId: number,
    dto: AddWorkspaceMemberDto,
    currentUserId?: number,
  ): Promise<WorkspaceMember> {
    // 1. Kiểm tra workspace tồn tại
    const workspace = await this.workspaceRepo.findOneBy({ id: workspaceId });
    if (!workspace) {
      throw new NotFoundException(
        `Workspace với ID #${workspaceId} không tồn tại.`,
      );
    }

    // 2. Kiểm tra user tồn tại
    const userExists = await this.userService.checkExistUser([dto.userId]);
    if (!userExists) {
      throw new BadRequestException(
        `Người dùng với ID #${dto.userId} không tồn tại trên hệ thống.`,
      );
    }

    // 3. Kiểm tra vai trò (Role) tồn tại
    const roleExists = await this.roleRepo.exists({
      where: { id: dto.roleId },
    });
    if (!roleExists) {
      throw new BadRequestException(
        `Vai trò (Role) với ID #${dto.roleId} không tồn tại trên hệ thống.`,
      );
    }

    // 4. Xác định trạng thái ban đầu:
    // - Nếu là Owner của workspace thêm: duyệt thẳng vào trạng thái "Tham gia" (MS001)
    // - Nếu workspace Private (WSM001) & không phải Owner thêm: cần duyệt => "Chờ duyệt" (MS002), joinedAt = null
    // - Nếu workspace Public (WSM002): không cần duyệt => "Tham gia" (MS001), joinedAt = new Date()
    const isOwner = currentUserId === workspace.ownerId;
    const isPrivate = workspace.mode === 'WSM001';

    let status = 'MS001';
    let joinedAt: Date | null = new Date();

    if (!isOwner && isPrivate) {
      status = 'MS002'; // Chờ duyệt
      joinedAt = null;
    }

    // 5. Kiểm tra user đã là thành viên của workspace hay chưa
    const existingMember = await this.workmemRepo.findOne({
      where: { workspaceId, userId: dto.userId },
    });
    if (existingMember) {
      if (existingMember.status === 'MS002') {
        throw new BadRequestException(
          `Yêu cầu tham gia workspace của người dùng #${dto.userId} đang chờ chủ sở hữu phê duyệt.`,
        );
      }
      if (
        existingMember.status === 'MS001' ||
        existingMember.status === 'active'
      ) {
        throw new BadRequestException(
          `Người dùng #${dto.userId} đã là thành viên của workspace #${workspaceId}.`,
        );
      }
      // Nếu trước đó bị từ chối (MS003), cho phép gửi lại yêu cầu / thêm lại
      existingMember.roleId = dto.roleId;
      existingMember.status = status;
      existingMember.joinedAt = joinedAt;
      existingMember.updatedBy = currentUserId ?? null;
      await this.workmemRepo.save(existingMember);
      return this.findOne(workspaceId, existingMember.userId);
    }

    // 6. Khởi tạo và lưu thông tin thành viên
    const newMember = this.workmemRepo.create({
      workspaceId,
      userId: dto.userId,
      roleId: dto.roleId,
      status: status,
      joinedAt: joinedAt,
      createdBy: currentUserId ?? null,
    });

    const savedMember = await this.workmemRepo.save(newMember);

    // Trả về dữ liệu kèm quan hệ role & user
    return this.findOne(workspaceId, savedMember.userId);
  }

  /**
   * Phê duyệt thành viên vào workspace (chỉ dành cho Owner)
   */
  async approveMember(
    workspaceId: number,
    userId: number,
    currentUserId?: number,
  ): Promise<WorkspaceMember> {
    const workspace = await this.workspaceRepo.findOneBy({ id: workspaceId });
    if (!workspace) {
      throw new NotFoundException(
        `Workspace với ID #${workspaceId} không tồn tại.`,
      );
    }

    // Chỉ chủ sở hữu (Owner) mới có quyền duyệt thành viên
    if (workspace.ownerId !== currentUserId) {
      throw new ForbiddenException(
        'Chỉ chủ sở hữu (Owner) của workspace mới có quyền phê duyệt thành viên.',
      );
    }

    const member = await this.workmemRepo.findOne({
      where: { workspaceId, userId },
    });

    if (!member) {
      throw new NotFoundException(
        `Không tìm thấy yêu cầu thành viên với User ID #${userId} trong workspace #${workspaceId}.`,
      );
    }

    member.status = 'MS001'; // Tham gia
    member.joinedAt = new Date();
    member.updatedBy = currentUserId ?? null;

    await this.workmemRepo.save(member);
    return this.findOne(workspaceId, userId);
  }

  /**
   * Từ chối yêu cầu tham gia workspace của thành viên (chỉ dành cho Owner)
   */
  async rejectMember(
    workspaceId: number,
    userId: number,
    currentUserId?: number,
  ): Promise<{ message: string }> {
    const workspace = await this.workspaceRepo.findOneBy({ id: workspaceId });
    if (!workspace) {
      throw new NotFoundException(
        `Workspace với ID #${workspaceId} không tồn tại.`,
      );
    }

    // Chỉ chủ sở hữu (Owner) mới có quyền từ chối
    if (workspace.ownerId !== currentUserId) {
      throw new ForbiddenException(
        'Chỉ chủ sở hữu (Owner) của workspace mới có quyền từ chối yêu cầu tham gia.',
      );
    }

    if (workspace.ownerId === userId) {
      throw new BadRequestException(
        'Không thể từ chối chính chủ sở hữu của workspace.',
      );
    }

    const member = await this.workmemRepo.findOne({
      where: { workspaceId, userId },
    });

    if (!member) {
      throw new NotFoundException(
        `Không tìm thấy yêu cầu thành viên với User ID #${userId} trong workspace #${workspaceId}.`,
      );
    }

    // Đánh dấu từ chối (MS003)
    member.status = 'MS003';
    member.updatedBy = currentUserId ?? null;
    await this.workmemRepo.save(member);

    return {
      message: `Đã từ chối yêu cầu tham gia của người dùng #${userId} thành công.`,
    };
  }

  /**
   * Cập nhật thông tin thành viên (vai trò roleId hoặc trạng thái status)
   */
  async updateMember(
    workspaceId: number,
    userId: number,
    dto: UpdateWorkspaceMemberDto,
    currentUserId?: number,
  ): Promise<WorkspaceMember> {
    const member = await this.workmemRepo.findOne({
      where: { workspaceId, userId },
    });

    if (!member) {
      throw new NotFoundException(
        `Thành viên với User ID #${userId} không tồn tại trong workspace #${workspaceId}.`,
      );
    }

    // Nếu cập nhật vai trò, kiểm tra roleId có hợp lệ không
    if (dto.roleId !== undefined) {
      const roleExists = await this.roleRepo.exists({
        where: { id: dto.roleId },
      });
      if (!roleExists) {
        throw new BadRequestException(
          `Vai trò với ID #${dto.roleId} không tồn tại trên hệ thống.`,
        );
      }
      member.roleId = dto.roleId;
    }

    // Nếu cập nhật trạng thái
    if (dto.status !== undefined) {
      member.status = dto.status;
    }

    member.updatedBy = currentUserId ?? null;
    await this.workmemRepo.save(member);

    return this.findOne(workspaceId, userId);
  }

  /**
   * Xóa thành viên khỏi workspace
   */
  async removeMember(
    workspaceId: number,
    userId: number,
  ): Promise<{ message: string }> {
    const workspace = await this.workspaceRepo.findOneBy({ id: workspaceId });
    if (!workspace) {
      throw new NotFoundException(
        `Workspace với ID #${workspaceId} không tồn tại.`,
      );
    }

    // Không cho phép xóa chủ sở hữu khỏi workspace
    if (workspace.ownerId === userId) {
      throw new BadRequestException(
        'Không thể xóa chủ sở hữu (Owner) khỏi workspace.',
      );
    }

    const member = await this.workmemRepo.findOne({
      where: { workspaceId, userId },
    });

    if (!member) {
      throw new NotFoundException(
        `Thành viên với ID #${userId} không tồn tại trong workspace #${workspaceId}.`,
      );
    }

    await this.workmemRepo.remove(member);

    return {
      message: `Đã xóa thành viên #${userId} khỏi workspace #${workspaceId} thành công.`,
    };
  }

  /**
   * Tương thích ngược: Thêm mới hoặc cập nhật vai trò nếu thành viên đã tồn tại
   */
  async saveWorkspaceMember(
    workspaceId: number,
    userId: number,
    roleId: number,
    currentUserId?: number,
  ): Promise<WorkspaceMember> {
    const existMember = await this.workmemRepo.findOne({
      where: { workspaceId, userId },
    });

    if (existMember) {
      return this.updateMember(workspaceId, userId, { roleId }, currentUserId);
    }

    return this.addMember(workspaceId, { userId, roleId }, currentUserId);
  }

  /**
   * Tương thích ngược: Xóa thành viên
   */
  async removeWorkspaceMember(workspaceId: number, userId: number) {
    return this.removeMember(workspaceId, userId);
  }
}
