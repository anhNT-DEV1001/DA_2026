import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RolePermission } from '../entites/role-permission.entity.js';
import { Role } from '../entites/role.entity.js';
import { Permission } from '../entites/permission.entity.js';
import { In, Repository } from 'typeorm';

@Injectable()
export class RolePermissionService {
  constructor(
    @InjectRepository(RolePermission)
    private readonly rolePermissionRepo: Repository<RolePermission>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionRepo: Repository<Permission>,
  ) {}

  /**
   * Lấy danh sách permissionId mà vai trò roleId đang sở hữu
   */
  async getPermissionsByRoleId(roleId: number): Promise<number[]> {
    const list = await this.rolePermissionRepo.find({
      where: { roleId },
      select: { permissionId: true },
    });
    return list.map((item) => item.permissionId);
  }

  /**
   * Gán 1 permission cho role
   */
  async addPermissionToRole(
    roleId: number,
    permissionId: number,
  ): Promise<RolePermission> {
    const existRole = await this.roleRepo.exists({ where: { id: roleId } });
    if (!existRole) throw new BadRequestException('Vai trò không tồn tại !');

    const existPerm = await this.permissionRepo.exists({
      where: { id: permissionId },
    });
    if (!existPerm) throw new BadRequestException('Thao tác không tồn tại !');

    const existMapping = await this.rolePermissionRepo.findOne({
      where: { roleId, permissionId },
    });
    if (existMapping) return existMapping;

    const newRolePerm = this.rolePermissionRepo.create({
      roleId,
      permissionId,
    });
    return this.rolePermissionRepo.save(newRolePerm);
  }

  /**
   * Thu hồi (xóa) 1 permission khỏi role
   */
  async removePermissionFromRole(
    roleId: number,
    permissionId: number,
  ): Promise<boolean> {
    const existMapping = await this.rolePermissionRepo.findOne({
      where: { roleId, permissionId },
    });

    if (existMapping) {
      await this.rolePermissionRepo.remove(existMapping);
      return true;
    }
    return false;
  }

  /**
   * Chuyển đổi (Toggle) trạng thái permission của role
   */
  async togglePermissionForRole(
    roleId: number,
    permissionId: number,
  ): Promise<{ assigned: boolean; roleId: number; permissionId: number }> {
    const existMapping = await this.rolePermissionRepo.findOne({
      where: { roleId, permissionId },
    });

    if (existMapping) {
      await this.rolePermissionRepo.remove(existMapping);
      return { assigned: false, roleId, permissionId };
    }

    const existRole = await this.roleRepo.exists({ where: { id: roleId } });
    if (!existRole) throw new BadRequestException('Vai trò không tồn tại !');

    const existPerm = await this.permissionRepo.exists({
      where: { id: permissionId },
    });
    if (!existPerm) throw new BadRequestException('Thao tác không tồn tại !');

    const newRolePerm = this.rolePermissionRepo.create({
      roleId,
      permissionId,
    });
    await this.rolePermissionRepo.save(newRolePerm);

    return { assigned: true, roleId, permissionId };
  }

  /**
   * Cập nhật đồng bộ toàn bộ danh sách permissions cho role
   */
  async updateRolePermissions(
    roleId: number,
    permissionIds: number[],
  ): Promise<number[]> {
    const existRole = await this.roleRepo.exists({ where: { id: roleId } });
    if (!existRole) throw new BadRequestException('Vai trò không tồn tại !');

    // Xóa tất cả các gán quyền cũ của role
    await this.rolePermissionRepo.delete({ roleId });

    if (permissionIds.length > 0) {
      const validPermissions = await this.permissionRepo.find({
        where: { id: In(permissionIds) },
        select: { id: true },
      });
      const validIds = validPermissions.map((p) => p.id);

      const newEntities = validIds.map((pId) =>
        this.rolePermissionRepo.create({
          roleId,
          permissionId: pId,
        }),
      );
      await this.rolePermissionRepo.save(newEntities);
      return validIds;
    }

    return [];
  }
}
