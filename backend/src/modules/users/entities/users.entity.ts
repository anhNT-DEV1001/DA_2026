import { SoftDeleteEntity } from '../../../infrastructure/database/entites/index.js';
import { Column, Entity, OneToMany, type Relation } from 'typeorm';
import { UserSession } from '../../auth/entities/user-session.entity.js';
import { UserRole } from './user-role.entity.js';
import { UserPermission } from './user-permission.entity.js';

@Entity('users')
export class User extends SoftDeleteEntity {
  @Column({ type: 'varchar', length: 255, unique: true })
  username: string;
  @Column({ type: 'varchar', length: 100 })
  password: string;
  @Column({ type: 'varchar', length: 255, name: 'full_name' })
  fullName: string;
  @Column({ type: 'varchar', length: 255, nullable: true, unique: true })
  email: string | null;
  @Column({ type: 'varchar', length: 20, nullable: true, unique: true })
  phone: string | null;
  @Column({ type: 'varchar', length: 20, nullable: true })
  gender: string | null;
  @Column({ type: 'varchar', nullable: true, length: 255 })
  avatar: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true })
  address: string | null;
  @Column({ type: 'date', nullable: true })
  dob: Date | null;
  @OneToMany(() => UserRole, (userRole) => userRole.user)
  userRoles: Relation<UserRole>[];

  @OneToMany(() => UserPermission, (userPermission) => userPermission.user)
  userPermissions: Relation<UserPermission>[];

  @OneToMany(() => UserSession, (session) => session.user)
  sessions: Relation<UserSession>[];

  /**
   * Kiểm tra người dùng có quyền tương ứng với `code` hay không
   * @param code Mã quyền cần kiểm tra (ví dụ: 'USER_CREATE', 'ROLE_VIEW')
   * @returns true nếu có quyền, ngược lại false
   */
  hasPermission(code: string): boolean {
    const now = new Date();

    // 1. Kiểm tra tập userPermissions: nếu đã bị revoke thì loại bỏ luôn (kể cả khi role có)
    if (this.userPermissions?.length) {
      const isRevoked = this.userPermissions.some((up) => {
        return (
          up.permission?.code === code &&
          up.revorkeAt &&
          new Date(up.revorkeAt) <= now
        );
      });

      if (isRevoked) return false;

      // Nếu được cấp trực tiếp và chưa bị revoke
      const hasDirectPermission = this.userPermissions.some((up) => {
        return (
          up.permission?.code === code &&
          (!up.revorkeAt || new Date(up.revorkeAt) > now)
        );
      });

      if (hasDirectPermission) return true;
    }

    // 2. Kiểm tra quyền thừa hưởng từ các Role của User (nếu chưa bị revoke ở trên)
    if (this.userRoles?.length) {
      const hasRolePermission = this.userRoles.some((ur) => {
        const role = ur.role;
        if (!role?.rolePermissions) return false;

        return role.rolePermissions.some((rp) => rp.permission?.code === code);
      });

      if (hasRolePermission) return true;
    }

    return false;
  }
}
