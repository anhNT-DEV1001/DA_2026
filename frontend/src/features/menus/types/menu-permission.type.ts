import type { MenuItem } from "./menu.type";

export interface PermissionItem {
  id: number;
  name: string;
  action: string;
  menuId: number;
  code: string;
  menu?: MenuItem;
  createdBy?: number | null;
  updatedBy?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export type Permission = PermissionItem;

export interface CreatePermissionDto {
  name: string;
  action: string;
  menuId: number;
  code: string;
}

export interface UpdatePermissionDto extends Partial<CreatePermissionDto> {}

export interface PermissionQueryParams {
  name?: string;
  code?: string;
  action?: string;
  menuId?: number;
  page?: number;
  limit?: number;
}

export interface PaginatedPermissionResponse {
  items: PermissionItem[];
  meta: {
    page: number;
    limit: number;
    itemCount: number;
    pageCount: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
  };
}
