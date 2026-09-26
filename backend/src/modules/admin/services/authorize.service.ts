import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UsersService } from '../../users/users.service.js';
import { Permission, RolePermission } from '../entites/index.js';
import { In, Repository } from 'typeorm';
import { UserPermission, UserRole } from '../../users/entities/index.js';

@Injectable()
export class AuthorizeService {
  constructor(
    @InjectRepository(RolePermission)
    private readonly rolePermissionRepo: Repository<RolePermission>,
    @InjectRepository(Permission)
    private readonly permissionRepo: Repository<Permission>,
    private readonly userService: UsersService,
  ) {}

  /**
   * Lấy tất cả permission của user từ Role và UserPermission.
   * Nếu một permission bị revoke trong user_permissions thì sẽ bị loại bỏ
   * kể cả khi permission đó thuộc về role của user.
   * @param userId ID của người dùng
   * @returns Danh sách các Permission duy nhất
   */
  async getUserPermission(userId: number): Promise<Permission[]> {
    if (!userId) return [];

    const now = new Date();

    // 1. Lấy toàn bộ role của user -> lấy danh sách permission ứng với các role đó
    const userRoles = await this.rolePermissionRepo.manager
      .getRepository(UserRole)
      .find({
        where: { userId },
      });

    const roleIds = userRoles.map((ur) => ur.roleId);

    let rolePermissions: Permission[] = [];
    if (roleIds.length > 0) {
      const rolePerms = await this.rolePermissionRepo.find({
        where: { roleId: In(roleIds) },
        relations: { permission: true },
      });
      rolePermissions = rolePerms
        .map((rp) => rp.permission)
        .filter((p): p is Permission => !!p);
    }

    // 2. Lấy toàn bộ user_permissions của user
    const userPerms = await this.permissionRepo.manager
      .getRepository(UserPermission)
      .find({
        where: { userId },
        relations: { permission: true },
      });

    // Phân loại: Quyền bị thu hồi (revoked) và quyền được cấp riêng (granted)
    const revokedPermissionIds = new Set<number>();
    const directGrantedPermissions: Permission[] = [];

    for (const up of userPerms) {
      const isRevoked = up.revorkeAt && new Date(up.revorkeAt) <= now;
      if (isRevoked) {
        revokedPermissionIds.add(up.permissionId);
      } else if (up.permission) {
        directGrantedPermissions.push(up.permission);
      }
    }

    // 3. Loại bỏ các permission đã bị revoke khỏi danh sách quyền kế thừa từ Role
    const activeRolePermissions = rolePermissions.filter(
      (perm) => !revokedPermissionIds.has(perm.id),
    );

    // 4. Hợp nhất (Role còn hiệu lực + Cấp trực tiếp) và loại bỏ trùng lặp theo id
    const permissionMap = new Map<number, Permission>();
    for (const permission of [
      ...activeRolePermissions,
      ...directGrantedPermissions,
    ]) {
      permissionMap.set(permission.id, permission);
    }

    return Array.from(permissionMap.values());
  }
}
