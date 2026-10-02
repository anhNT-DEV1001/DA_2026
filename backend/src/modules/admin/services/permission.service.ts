import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Menu, Permission } from '../entites/index.js';
import {
  FindManyOptions,
  FindOptionsWhere,
  Like,
  Not,
  Repository,
} from 'typeorm';
import {
  CreatePermissionDto,
  PermissionDto,
  PermissionRequest,
  UpdatePermissionDto,
} from '../dtos/index.js';
import { UserResponse } from '../../users/dtos/index.js';
import {
  PageMetadataResponse,
  PageResponse,
} from '../../../common/responses/index.js';

@Injectable()
export class PermissionService {
  constructor(
    @InjectRepository(Permission)
    private readonly permissonRepo: Repository<Permission>,
    @InjectRepository(Menu)
    private readonly menuRepo: Repository<Menu>,
  ) {}

  /**
   * Tạo hoặc Cập nhật thao tác (Permission)
   */
  async savePermission(
    dto: PermissionDto | CreatePermissionDto | UpdatePermissionDto,
    user?: UserResponse,
    id?: number,
  ): Promise<Permission> {
    // 1. Kiểm tra menu có tồn tại không nếu menuId được cung cấp
    if (dto.menuId) {
      const existMenu = await this.menuRepo.exists({
        where: { id: dto.menuId },
      });
      if (!existMenu) {
        throw new BadRequestException(
          'Menu được chọn không tồn tại trên hệ thống !',
        );
      }
    }

    // 2. Kiểm tra mã thao tác (code) đã tồn tại chưa
    if (dto.code) {
      const codeWhereCondition: FindOptionsWhere<Permission> = {
        code: dto.code,
      };
      if (id) {
        codeWhereCondition.id = Not(id);
      }
      const existCode = await this.permissonRepo.exists({
        where: codeWhereCondition,
      });
      if (existCode) {
        throw new BadRequestException(
          'Mã thao tác (code) đã tồn tại trên hệ thống !',
        );
      }
    }

    let permissionData: Permission;

    if (id) {
      // Update
      const existPermission = await this.permissonRepo.findOne({
        where: { id },
      });
      if (!existPermission) {
        throw new BadRequestException('Không tìm thấy thao tác hợp lệ !');
      }

      existPermission.updatedBy = user?.id ?? null;
      permissionData = this.permissonRepo.merge(existPermission, dto);
    } else {
      // Create
      permissionData = this.permissonRepo.create({
        ...dto,
        createdBy: user?.id ?? null,
        updatedBy: user?.id ?? null,
      });
    }

    return this.permissonRepo.save(permissionData);
  }

  /**
   * Alias tương thích với hàm savePermissionMenu sơ bộ trước đó
   */
  async savePermissionMenu(
    dto: PermissionDto | CreatePermissionDto | UpdatePermissionDto,
    id?: number,
    user?: UserResponse,
  ): Promise<Permission> {
    return this.savePermission(dto, user, id);
  }

  /**
   * Lấy danh sách thao tác (hỗ trợ lọc và phân trang)
   */
  async getListPermission(
    query: PermissionRequest,
  ): Promise<PageResponse<Permission> | Permission[]> {
    const whereCondition: FindOptionsWhere<Permission> = {};

    if (query.name) whereCondition.name = Like(`%${query.name}%`);
    if (query.code) whereCondition.code = Like(`%${query.code}%`);
    if (query.action) whereCondition.action = query.action;
    if (query.menuId) whereCondition.menuId = query.menuId;

    const options: FindManyOptions<Permission> = {
      where: whereCondition,
      relations: { menu: true },
      order: { createdAt: 'DESC' },
    };

    if (query.page !== undefined || query.limit !== undefined) {
      const [permissions, itemCount] = await this.permissonRepo.findAndCount({
        ...options,
        skip: query.skip,
        take: query.limit ?? 15,
      });
      const meta = new PageMetadataResponse({ pageRequest: query, itemCount });
      return new PageResponse(permissions, meta);
    }

    return this.permissonRepo.find(options);
  }

  /**
   * Lấy chi tiết 1 thao tác theo ID
   */
  async getPermissionById(id: number): Promise<Permission> {
    const permission = await this.permissonRepo.findOne({
      where: { id },
      relations: { menu: true },
    });
    if (!permission) {
      throw new BadRequestException('Thao tác không tồn tại !');
    }
    return permission;
  }

  /**
   * Lấy danh sách thao tác thuộc về 1 Menu
   */
  async getPermissionInMenu(menuId: number): Promise<Permission[]> {
    return this.permissonRepo.find({
      where: { menuId },
      order: { id: 'ASC' },
    });
  }

  /**
   * Lấy ma trận Menu - Permission (cấu trúc cây Menu kèm danh sách Permission tương ứng)
   */

  async getMenuPermissionMatrix(): Promise<Menu[]> {
    // 1. Lấy tất cả các Menu đang hoạt động cùng với các Permission tương ứng
    const allMenus = await this.menuRepo.find({
      where: { isActive: true },
      relations: { permissions: true },
      order: { displayOrder: 'ASC' },
    });

    // 2. Xây dựng cấu trúc cây Menu (hỗ trợ N cấp menu)
    const menuMap = new Map<number, Menu>();
    allMenus.forEach((menu) => {
      menu.children = [];
      menuMap.set(menu.id, menu);
    });

    const rootMenus: Menu[] = [];
    allMenus.forEach((menu) => {
      if (menu.parentId && menuMap.has(menu.parentId)) {
        menuMap.get(menu.parentId)!.children.push(menu);
      } else {
        rootMenus.push(menu);
      }
    });

    return rootMenus;
  }

  /**
   * Xóa thao tác theo ID
   */
  async removePermission(
    id: number,
    _user?: UserResponse,
  ): Promise<Permission> {
    const permission = await this.permissonRepo.findOne({
      where: { id },
    });

    if (!permission) throw new BadRequestException('Thao tác không tồn tại !');

    return this.permissonRepo.remove(permission);
  }
}
