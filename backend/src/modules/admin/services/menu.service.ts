import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Menu } from '../entites/index.js';
import {
  FindManyOptions,
  FindOptionsWhere,
  IsNull,
  Not,
  Repository,
} from 'typeorm';
import { MenuDto, MenuRequest } from '../dtos/index.js';
import { UserResponse } from '../../users/dtos/index.js';
import {
  PageMetadataResponse,
  PageResponse,
} from '../../../common/responses/index.js';

@Injectable()
export class MenuService {
  constructor(
    @InjectRepository(Menu)
    private readonly menuRepository: Repository<Menu>,
  ) {}

  async getSidebarMenus(): Promise<Menu[]> {
    const menus = await this.menuRepository.find({
      where: { isActive: true, isSideBarDisplay: true, parentId: IsNull() },
      relations: {
        children: true,
      },
      order: { displayOrder: 'ASC' },
    });
    return menus;
  }

  async getListMenus(query: MenuRequest): Promise<PageResponse<Menu> | Menu[]> {
    const whereCondition: FindOptionsWhere<Menu> = {
      isActive: query.isActive ?? true,
      // parentId: IsNull(),
    };
    if (query.name) whereCondition.name = query.name;

    const options: FindManyOptions<Menu> = {
      where: whereCondition,
      relations: { children: true },
      order: { displayOrder: 'ASC' },
    };

    if (query.page !== undefined || query.limit !== undefined) {
      const [menus, itemCount] = await this.menuRepository.findAndCount({
        ...options,
        skip: query.skip,
        take: query.limit ?? 15,
      });
      const meta = new PageMetadataResponse({ pageRequest: query, itemCount });
      return new PageResponse(menus, meta);
    }

    return this.menuRepository.find(options);
  }

  async getMenuById(id: number) {
    const menu = await this.menuRepository.findOne({
      where: { id },
      relations: {
        children: true,
      },
    });
    return menu;
  }

  async saveMenu(
    dto: MenuDto,
    user?: UserResponse,
    id?: number,
  ): Promise<Menu> {
    let menuData;
    // validate alias unique
    const whereCondition: FindOptionsWhere<Menu> = { alias: dto.alias };
    if (id) {
      whereCondition.id = Not(id);
      const existMenu = await this.menuRepository.findOne({ where: { id } });
      if (!existMenu) throw new BadRequestException('Menu không tồn tại.');
      existMenu.updatedBy = user?.id ? user.id : null;
      menuData = this.menuRepository.merge(existMenu, dto);
    } else {
      menuData = this.menuRepository.create({
        ...dto,
        createdBy: user?.id ?? null,
        updatedBy: user?.id ?? null,
      });
    }

    const validate = await this.menuRepository.exists({
      where: whereCondition,
    });
    if (validate)
      throw new BadRequestException('Thông tin menu đã tồn tại trên hệ thống');
    const response = await this.menuRepository.save(menuData);

    return response;
  }

  async removeMenu(id: number, user?: UserResponse) {
    const menu = await this.menuRepository.findOne({ where: { id } });
    if (!menu) {
      throw new BadRequestException('Menu không tồn tại.');
    }
    return this.menuRepository.remove(menu);
  }
}
