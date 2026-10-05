import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, Not, Repository } from 'typeorm';
import { Workspace, WorkspaceMember } from '../entities/index.js';
import { UserResponse } from '../../users/dtos/index.js';
import {
  CreateWorkspaceDto,
  UpdateWorkspaceDto,
  WorkspaceRequest,
} from '../dtos/index.js';
import {
  PageMetadataResponse,
  PageResponse,
} from '../../../common/responses/index.js';
import { slugify } from '../utils/slug.util.js';

@Injectable()
export class WorkspacesService {
  constructor(
    @InjectRepository(Workspace)
    private readonly workspaceRepo: Repository<Workspace>,
    @InjectRepository(WorkspaceMember)
    private readonly memberRepo: Repository<WorkspaceMember>,
  ) {}

  /**
   * Lấy danh sách workspace có hỗ trợ tìm kiếm và phân trang
   */
  async findAll(
    query: WorkspaceRequest,
    user?: UserResponse,
  ): Promise<PageResponse<Workspace> | Workspace[]> {
    const qb = this.workspaceRepo
      .createQueryBuilder('ws')
      .leftJoinAndSelect('ws.owner', 'owner')
      .leftJoinAndSelect('ws.members', 'members')
      .orderBy('ws.isStar', 'DESC')
      .addOrderBy('ws.displayOrder', 'ASC')
      .addOrderBy('ws.createdAt', 'DESC');

    // Lọc theo chế độ public / private
    if (query.mode) {
      qb.andWhere('ws.mode = :mode', { mode: query.mode });
    }

    // Lọc theo ownerId
    if (query.ownerId) {
      qb.andWhere('ws.ownerId = :ownerId', { ownerId: query.ownerId });
    }

    // Lọc theo isStar
    if (query.isStar !== undefined) {
      qb.andWhere('ws.isStar = :isStar', { isStar: query.isStar });
    }

    // Tìm kiếm theo từ khóa (name, slug, description)
    if (query.search?.trim()) {
      const searchTerm = `%${query.search.trim()}%`;
      qb.andWhere(
        '(ws.name ILIKE :search OR ws.slug ILIKE :search OR ws.description ILIKE :search)',
        { search: searchTerm },
      );
    }

    if (query.page !== undefined || query.limit !== undefined) {
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
   * Lấy tất cả workspace mà người dùng hiện tại là chủ sở hữu hoặc là thành viên
   */
  async getCurrentUserWorkspaces(user: UserResponse): Promise<Workspace[]> {
    if (!user?.id) {
      return [];
    }

    const workspaces = await this.workspaceRepo
      .createQueryBuilder('ws')
      .leftJoinAndSelect('ws.owner', 'owner')
      .leftJoinAndSelect('ws.members', 'members')
      .leftJoin('ws.members', 'userMember', 'userMember.userId = :userId', {
        userId: user.id,
      })
      .where('ws.ownerId = :userId OR userMember.userId = :userId', {
        userId: user.id,
      })
      .orderBy('ws.isStar', 'DESC')
      .addOrderBy('ws.displayOrder', 'ASC')
      .addOrderBy('ws.createdAt', 'DESC')
      .getMany();

    return workspaces;
  }

  /**
   * Lấy chi tiết workspace theo ID
   */
  async getWorkspaceById(id: number): Promise<Workspace> {
    const ws = await this.workspaceRepo.findOne({
      where: { id },
      relations: {
        owner: true,
        members: {
          user: true,
          role: true,
        },
      },
    });

    if (!ws) {
      throw new NotFoundException(`Không tìm thấy workspace với ID #${id}`);
    }

    return ws;
  }

  /**
   * Lấy chi tiết workspace theo slug
   */
  async getWorkspaceBySlug(
    slug: string,
    user?: UserResponse,
  ): Promise<Workspace> {
    const ws = await this.workspaceRepo.findOne({
      where: { slug },
      relations: {
        owner: true,
        members: {
          user: true,
          role: true,
        },
      },
    });

    if (!ws) {
      throw new NotFoundException(
        `Không tìm thấy workspace với slug "${slug}"`,
      );
    }

    return ws;
  }

  /**
   * Tạo mới một workspace
   */
  async createWorkspace(
    dto: CreateWorkspaceDto,
    user?: UserResponse,
  ): Promise<Workspace> {
    const ownerId = dto.ownerId ?? user?.id;
    if (!ownerId) {
      throw new BadRequestException(
        'Không thể xác định chủ sở hữu của workspace.',
      );
    }

    // Xử lý slug tự động nếu không được cung cấp
    let slug = dto.slug?.trim() ? slugify(dto.slug) : slugify(dto.name);
    if (!slug) {
      slug = `workspace-${Date.now()}`;
    }

    // Kiểm tra tính duy nhất của slug
    const isSlugExist = await this.workspaceRepo.exists({
      where: { slug },
    });

    if (isSlugExist) {
      if (dto.slug?.trim()) {
        throw new BadRequestException(
          `Đường dẫn (slug) "${slug}" đã tồn tại trên hệ thống. Vui lòng chọn slug khác.`,
        );
      }
      // Nếu là slug tự sinh từ name thì nối thêm hậu tố duy nhất
      slug = `${slug}-${Math.random().toString(36).substring(2, 7)}`;
    }

    const workspaceData = this.workspaceRepo.create({
      name: dto.name.trim(),
      description: dto.description?.trim() ?? null,
      slug,
      ownerId,
      mode: dto.mode ?? 'private',
      displayOrder: dto.displayOrder ?? 1,
      isStar: dto.isStar ?? false,
      createdBy: user?.id ?? null,
      updatedBy: user?.id ?? null,
    });

    const savedWorkspace = await this.workspaceRepo.save(workspaceData);

    return savedWorkspace;
  }

  /**
   * Cập nhật thông tin workspace
   */
  async updateWorkspace(
    id: number,
    dto: UpdateWorkspaceDto,
    user?: UserResponse,
  ): Promise<Workspace> {
    const workspace = await this.getWorkspaceById(id);

    // Kiểm tra quyền: Chỉ chủ sở hữu mới có quyền chỉnh sửa
    if (user && workspace.ownerId !== user.id) {
      throw new BadRequestException(
        'Bạn không có quyền chỉnh sửa workspace này.',
      );
    }

    // Kiểm tra và xử lý slug nếu có cập nhật
    if (dto.slug !== undefined) {
      const newSlug = slugify(dto.slug);
      if (!newSlug) {
        throw new BadRequestException('Slug không được để trống.');
      }

      const isSlugExist = await this.workspaceRepo.exists({
        where: { slug: newSlug, id: Not(id) },
      });

      if (isSlugExist) {
        throw new BadRequestException(
          `Đường dẫn (slug) "${newSlug}" đã được sử dụng bởi workspace khác.`,
        );
      }

      workspace.slug = newSlug;
    }

    if (dto.name !== undefined) {
      workspace.name = dto.name.trim();
    }

    if (dto.description !== undefined) {
      workspace.description = dto.description?.trim() ?? null;
    }

    if (dto.mode !== undefined) {
      workspace.mode = dto.mode;
    }

    if (dto.ownerId !== undefined) {
      workspace.ownerId = dto.ownerId;
    }

    if (dto.displayOrder !== undefined) {
      workspace.displayOrder = dto.displayOrder;
    }

    if (dto.isStar !== undefined) {
      workspace.isStar = dto.isStar;
    }

    workspace.updatedBy = user?.id ?? null;

    return await this.workspaceRepo.save(workspace);
  }

  /**
   * Xóa mềm (soft-delete) workspace
   */
  async removeWorkspace(id: number, user?: UserResponse): Promise<Workspace> {
    const workspace = await this.getWorkspaceById(id);

    // Kiểm tra quyền: Chỉ chủ sở hữu mới có quyền xóa
    if (user && workspace.ownerId !== user.id) {
      throw new BadRequestException('Bạn không có quyền xóa workspace này.');
    }

    workspace.deletedBy = user?.id ?? null;
    return await this.workspaceRepo.softRemove(workspace);
  }
}
