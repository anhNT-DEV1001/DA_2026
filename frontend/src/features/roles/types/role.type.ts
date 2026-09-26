export interface RoleItem {
  id: number;
  name: string;
  description: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  createdBy?: number | null;
  updatedBy?: number | null;
}

export type Role = RoleItem;

export interface CreateRoleDto {
  name: string;
  description?: string;
}

export interface UpdateRoleDto extends Partial<CreateRoleDto> {}

export interface RoleQueryParams {
  name?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedRoleResponse {
  items: RoleItem[];
  meta: {
    page: number;
    limit: number;
    itemCount: number;
    pageCount: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
  };
}
