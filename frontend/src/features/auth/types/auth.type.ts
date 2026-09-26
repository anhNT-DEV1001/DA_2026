export interface Role {
  id: number;
  name: string;
  description?: string;
}

export interface Permission {
  id: number;
  code: string;
  name: string;
}

export interface UserProfile {
  id: number;
  username: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  gender: string | null;
  avatar: string | null;
  address?: string | null;
  dob?: string | null;
}

export interface LoginDto {
  username: string;
  password: string;
}

export interface RegisterDto {
  username: string;
  password: string;
  passwordConfirm: string;
  fullName: string;
  email: string;
  phone: string;
  gender: string;
  address?: string;
  dob?: string;
  roleIds?: number[];
  avatar?: File | string;
}

export interface LoginResponse {
  user: UserProfile;
  token: {
    accessToken: string;
    refreshToken: string;
    sessionId: string;
  };
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUserResponse {
  user: UserProfile;
  roles: Role[];
  permissions: Permission[];
  token?: {
    accessToken: string;
    sessionId: string;
  };
}

export interface ApiResponse<T> {
  statusCode: number;
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}
