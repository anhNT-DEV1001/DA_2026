import { Permission, Role } from '../../admin/entites/index.js';
import { UserResponse } from '../../users/dtos/index.js';

export class AuthUser {
  user: UserResponse;
  roles: Role[];
  permissions: Permission[];
  token: {
    accessToken: string;
    sessionId: string;
  };
}

export class RefreshAuthUser {
  user: UserResponse;
  token: {
    refreshToken: string;
    sessionId: string;
  };
}
