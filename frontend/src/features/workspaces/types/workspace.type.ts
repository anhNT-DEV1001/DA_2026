import type { UserItem } from "../../users/types";

export interface WorkspaceMemberItem {
  id: number;
  workspaceId: number;
  userId: number;
  roleId: number;
  status: string;
  joinedAt?: string | null;
  user?: UserItem;
  role?: {
    id: number;
    name: string;
    description?: string | null;
  };
  createdAt?: string | null;
  updatedAt?: string | null;
  createdBy?: number | null;
  updatedBy?: number | null;
}

export interface WorkspaceItem {
  id: number;
  name: string;
  description: string | null;
  slug: string;
  ownerId: number;
  mode: "public" | "private";
  owner?: UserItem;
  members?: WorkspaceMemberItem[];
  createdAt?: string | null;
  updatedAt?: string | null;
  deletedAt?: string | null;
  createdBy?: number | null;
  updatedBy?: number | null;
  deletedBy?: number | null;
}

export type Workspace = WorkspaceItem;

export interface CreateWorkspaceDto {
  name: string;
  description?: string;
  slug?: string;
  mode?: "public" | "private";
  ownerId?: number;
}

export interface UpdateWorkspaceDto {
  name?: string;
  description?: string;
  slug?: string;
  mode?: "public" | "private";
  ownerId?: number;
}

export interface WorkspaceQueryParams {
  search?: string;
  mode?: "public" | "private";
  ownerId?: number;
  page?: number;
  limit?: number;
}

export interface PaginatedWorkspaceResponse {
  items: WorkspaceItem[];
  meta: {
    page: number;
    limit: number;
    itemCount: number;
    pageCount: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
  };
}
