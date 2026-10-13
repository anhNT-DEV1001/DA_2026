import type { RoleItem } from "../../roles/types";
import type { UserItem } from "../../users/types";

export interface WorkspaceMemberItem {
  id: number;
  workspaceId: number;
  userId: number;
  roleId: number;
  status: string;
  joinedAt?: string | null;
  user?: UserItem;
  role?: RoleItem;
  createdAt?: string | null;
  updatedAt?: string | null;
  createdBy?: number | null;
  updatedBy?: number | null;
}

export type WorkspaceMemberType = WorkspaceMemberItem;

export interface AddWorkspaceMemberDto {
  userId: number;
  roleId: number;
  status?: string;
}

export interface UpdateWorkspaceMemberDto {
  roleId?: number;
  status?: string;
}

export interface WorkspaceMemberQueryParams {
  search?: string;
  roleId?: number;
  status?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedWorkspaceMemberResponse {
  items: WorkspaceMemberItem[];
  meta: {
    page: number;
    limit: number;
    itemCount: number;
    pageCount: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
  };
}

export interface DeleteWorkspaceMemberResponse {
  message: string;
}
