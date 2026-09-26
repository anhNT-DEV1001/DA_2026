import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Role } from '../entites/index.js';
import { FindOptionsWhere, Not, Repository } from 'typeorm';
import { RoleDto, RoleRequest } from '../dtos/index.js';
import {
  PageMetadataResponse,
  PageResponse,
} from '../../../common/responses/index.js';

@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
  ) {}

  async saveRole(dto: RoleDto, id?: number): Promise<Role> {
    const whereCondition: FindOptionsWhere<Role>[] = [];
    // Create
    if (!id) {
      whereCondition.push({
        name: dto.name,
      });
      if (await this.roleRepo.exists({ where: whereCondition }))
        throw new BadRequestException(
          'Tên quyền đã tồn tại trong hệ thông ! Vui lòng nhập lại tên',
        );
      const role = this.roleRepo.create({
        ...dto,
      });

      return this.roleRepo.save(role);
    }

    // Update
    whereCondition.push({
      id: Not(id),
      name: dto.name,
    });
    const existRole = await this.roleRepo.findOne({
      where: { id },
    });
    if (await this.roleRepo.exists({ where: whereCondition }))
      throw new BadRequestException(
        'Tên quyền đã tồn tại trong hệ thông ! Vui lòng nhập lại tên',
      );
    if (!existRole) {
      throw new BadRequestException(
        'Quyền không tồn tại, vui lòng thử lại sau !',
      );
    }

    const role = this.roleRepo.merge(existRole, {
      ...dto,
    });

    return this.roleRepo.save(role);
  }

  async removeRole(id: number): Promise<Role> {
    const role = await this.roleRepo.findOne({
      where: { id },
    });
    if (!role)
      throw new BadRequestException(
        'Quyền không tồn tại, vui lòng thử lại sau !',
      );
    await this.roleRepo.remove(role);
    return role;
  }

  async getById(id: number): Promise<Role> {
    const role = await this.roleRepo.findOne({ where: { id } });
    if (!role)
      throw new BadRequestException(
        'Tên quyền không tồn tại, vui lòng thử lại sau !',
      );
    return role;
  }

  async getListRole(query: RoleRequest): Promise<PageResponse<Role> | Role[]> {
    const whereCondition: FindOptionsWhere<Role> = {};
    if (query.name) whereCondition.name = query.name;

    if (query.page !== undefined || query.limit !== undefined) {
      const [roles, itemCount] = await this.roleRepo.findAndCount({
        where: whereCondition,
        skip: query.skip,
        take: query.limit ?? 15,
        order: { createdAt: 'ASC' },
      });
      const meta = new PageMetadataResponse({ pageRequest: query, itemCount });
      return new PageResponse(roles, meta);
    }
    return this.roleRepo.find({
      where: whereCondition,
      order: { createdAt: 'ASC' },
    });
  }
}
