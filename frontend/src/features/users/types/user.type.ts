export interface UserRoleItem {
  id: number;
  roleId: number;
  userId: number;
  role?: {
    id: number;
    name: string;
    description: string | null;
  };
}

export interface UserItem {
  id: number;
  username: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  gender: string | null;
  avatar: string | null;
  address?: string | null;
  dob?: string | null;
  userRoles?: UserRoleItem[];
  createdAt?: string | null;
  updatedAt?: string | null;
  deletedAt?: string | null;
  createdBy?: number | null;
  updatedBy?: number | null;
}

export type User = UserItem;

export interface CreateUserDto {
  username: string;
  password: string;
  passwordConfirm: string;
  fullName: string;
  email: string;
  phone: string;
  gender: string;
  roleIds: number[];
  address?: string;
  dob?: string | Date;
  avatar?: File | string | null;
}

export interface UpdateUserDto {
  fullName?: string;
  email?: string;
  phone?: string;
  gender?: string;
  roleIds?: number[];
  address?: string;
  dob?: string | Date;
  avatar?: File | string | null;
}

export interface UserQueryParams {
  search?: string;
  username?: string;
  email?: string;
  phone?: string;
  roleId?: number;
  page?: number;
  limit?: number;
}

export interface PaginatedUserResponse {
  items: UserItem[];
  meta: {
    page: number;
    limit: number;
    itemCount: number;
    pageCount: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
  };
}
