import type { UserItem } from "../../users/types";

import type { WorkspaceMemberItem } from "./workspace-member.type";

export type { WorkspaceMemberItem };

export interface WorkspaceItem {
  id: number;
  name: string;
  description: string | null;
  slug: string;
  ownerId: number;
  mode: "public" | "private";
  displayOrder?: number;
  isStar?: boolean;
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
  displayOrder?: number;
  isStar?: boolean;
}

export interface UpdateWorkspaceDto {
  name?: string;
  description?: string;
  slug?: string;
  mode?: "public" | "private";
  ownerId?: number;
  displayOrder?: number;
  isStar?: boolean;
}

export interface WorkspaceQueryParams {
  search?: string;
  mode?: "public" | "private";
  ownerId?: number;
  isStar?: boolean;
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
