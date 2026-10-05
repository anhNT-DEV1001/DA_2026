import { existsSync, unlinkSync } from 'fs';
import { resolve } from 'path';
import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import bcrypt from 'bcrypt';
import { FindOptionsWhere, ILike, In, Not, Repository } from 'typeorm';
import { Role } from '../admin/entites/index.js';
import {
  CreateUserDto,
  UpdateUserDto,
  UserRequest,
  UserResponse,
} from './dtos/index.js';
import { User, UserRole } from './entities/index.js';
import {
  PageMetadataResponse,
  PageResponse,
} from '../../common/responses/index.js';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(UserRole)
    private readonly userRoleRepo: Repository<UserRole>,
  ) {}

  private deleteAvatarFile(avatarPath?: string | null): void {
    if (!avatarPath) return;
    try {
      const relativePath = avatarPath.startsWith('/')
        ? avatarPath.slice(1)
        : avatarPath;
      const absolutePath = resolve(process.cwd(), relativePath);

      if (existsSync(absolutePath)) {
        unlinkSync(absolutePath);
      }
    } catch (error) {
      console.error(`Lỗi khi xóa file avatar (${avatarPath}):`, error);
    }
  }

  async createUser(dto: CreateUserDto): Promise<UserResponse> {
    return this.userRepo.manager.transaction(async (manager) => {
      const userRepo = manager.getRepository(User);
      const userRoleRepo = manager.getRepository(UserRole);
      const roleRepo = manager.getRepository(Role);
      const { password, passwordConfirm, roleIds, ...userData } = dto;

      if (password !== passwordConfirm)
        throw new BadRequestException(
          'Mật khẩu nhập lại không khớp, vui lòng nhập lại !',
        );

      const whereCondition: FindOptionsWhere<User>[] = [
        { username: dto.username },
      ];
      if (dto.email) whereCondition.push({ email: dto.email });
      if (dto.phone) whereCondition.push({ phone: dto.phone });
      if (await userRepo.exists({ where: whereCondition }))
        throw new BadRequestException(
          'Thông tin người dùng đã tồn tại, vui lòng thử lại sau !',
        );

      const validRoleIds = await this.validateRoleIds(roleRepo, roleIds);
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = userRepo.create({
        password: hashedPassword,
        ...userData,
      });
      await userRepo.save(user);

      if (validRoleIds.length) {
        const userRoles = userRoleRepo.create(
          validRoleIds.map((roleId) => ({ roleId, userId: user.id })),
        );
        await userRoleRepo.save(userRoles);
      }

      return new UserResponse().mapToResponse(user);
    });
  }

  async updateUser(id: number, dto: UpdateUserDto): Promise<UserResponse> {
    const result = await this.userRepo.manager.transaction(async (manager) => {
      const userRepo = manager.getRepository(User);
      const userRoleRepo = manager.getRepository(UserRole);
      const roleRepo = manager.getRepository(Role);
      const { roleIds, ...userData } = dto;

      const existUser = await userRepo.findOne({ where: { id } });
      if (!existUser)
        throw new BadRequestException(
          'Người dùng không tồn tại, vui lòng thử lại !',
        );

      const whereCondition: FindOptionsWhere<User>[] = [];
      if (dto.email) whereCondition.push({ email: dto.email, id: Not(id) });
      if (dto.phone) whereCondition.push({ phone: dto.phone, id: Not(id) });
      if (
        whereCondition.length &&
        (await userRepo.exists({ where: whereCondition }))
      )
        throw new BadRequestException(
          'Thông tin người dùng đã tồn tại trên hệ thống, vui lòng thử lại',
        );
      const validRoleIds =
        roleIds === undefined
          ? undefined
          : await this.validateRoleIds(roleRepo, roleIds);

      const oldAvatar = existUser.avatar;
      const user = userRepo.merge(existUser, userData);
      await userRepo.save(user);

      if (validRoleIds !== undefined) {
        await userRoleRepo.delete({ userId: user.id });
        if (validRoleIds.length) {
          const userRoles = userRoleRepo.create(
            validRoleIds.map((roleId) => ({ roleId, userId: user.id })),
          );
          await userRoleRepo.save(userRoles);
        }
      }
      return {
        userResponse: new UserResponse().mapToResponse(user),
        oldAvatar,
        newAvatar: dto.avatar,
      };
    });

    if (
      result.newAvatar !== undefined &&
      result.oldAvatar &&
      result.oldAvatar !== result.newAvatar
    ) {
      this.deleteAvatarFile(result.oldAvatar);
    }

    return result.userResponse;
  }

  async removeUser(id: number): Promise<UserResponse> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new BadRequestException('Người dùng không tồn tại !');

    const oldAvatar = user.avatar;
    await this.userRepo.softRemove(user);

    if (oldAvatar) {
      this.deleteAvatarFile(oldAvatar);
    }

    return new UserResponse().mapToResponse(user);
  }

  async getById(id: number): Promise<UserResponse> {
    const user = await this.getByIdWithRoles(id);
    if (!user) throw new BadRequestException('Người dùng không tồn tại !');

    return user;
  }

  async getByIdWithRoles(id: number): Promise<UserResponse | null> {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: {
        userRoles: {
          role: true,
        },
      },
    });
    if (!user) return null;
    return new UserResponse().mapToResponse(user);
  }

  async getByUsername(username: string): Promise<User | null> {
    const user = await this.userRepo.findOne({
      where: { username },
      relations: {
        userRoles: {
          role: true,
        },
      },
    });
    return user;
  }

  async getListUsers(
    query: UserRequest,
  ): Promise<PageResponse<UserResponse> | UserResponse[]> {
    const whereConditions: FindOptionsWhere<User>[] = [];
    const relations = {
      userRoles: {
        role: true,
      },
    };

    if (query.search) {
      const term = `%${query.search}%`;
      whereConditions.push(
        { username: ILike(term) },
        { fullName: ILike(term) },
        { email: ILike(term) },
        { phone: ILike(term) },
      );
    } else {
      const condition: FindOptionsWhere<User> = {};
      if (query.username) condition.username = ILike(`%${query.username}%`);
      if (query.email) condition.email = ILike(`%${query.email}%`);
      if (query.phone) condition.phone = ILike(`%${query.phone}%`);
      if (Object.keys(condition).length > 0) {
        whereConditions.push(condition);
      }
    }

    const where = whereConditions.length > 0 ? whereConditions : {};

    if (query.page !== undefined || query.limit !== undefined) {
      const [users, itemCount] = await this.userRepo.findAndCount({
        where,
        relations,
        skip: query.skip,
        take: query.limit ?? 15,
        order: { createdAt: 'DESC' },
      });
      const userResponses = users.map((u) =>
        new UserResponse().mapToResponse(u),
      );
      const meta = new PageMetadataResponse({ pageRequest: query, itemCount });
      return new PageResponse(userResponses, meta);
    }

    const users = await this.userRepo.find({
      where,
      relations,
      order: { createdAt: 'DESC' },
    });
    return users.map((u) => new UserResponse().mapToResponse(u));
  }

  private async validateRoleIds(
    roleRepo: Repository<Role>,
    roleIds: number[],
  ): Promise<number[]> {
    if (
      !Array.isArray(roleIds) ||
      roleIds.some((roleId) => !Number.isInteger(roleId) || roleId <= 0)
    )
      throw new BadRequestException('Danh sách quyền không hợp lệ !');

    const uniqueRoleIds = [...new Set(roleIds)];
    if (!uniqueRoleIds.length) return uniqueRoleIds;

    const roleCount = await roleRepo.countBy({ id: In(uniqueRoleIds) });
    if (roleCount !== uniqueRoleIds.length)
      throw new BadRequestException(
        'Một hoặc nhiều quyền không tồn tại trong hệ thống !',
      );

    return uniqueRoleIds;
  }
}
