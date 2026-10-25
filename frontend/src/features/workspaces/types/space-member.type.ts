import type { RoleItem } from "../../roles/types";
import type { UserItem } from "../../users/types";
import type { WorkspaceMemberItem } from "./workspace-member.type";

export interface SpaceMemberItem {
  id: number;
  spaceId: number;
  workspaceMemberId: number;
  workspaceMember?: WorkspaceMemberItem & {
    user?: UserItem;
    role?: RoleItem | null;
  };
  createdAt?: string | null;
  updatedAt?: string | null;
  createdBy?: number | null;
  updatedBy?: number | null;
}

export interface AddSpaceMemberDto {
  userId: number;
}

export interface SpaceMemberQueryParams {
  search?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedSpaceMemberResponse {
  items: SpaceMemberItem[];
  meta: {
    page: number;
    limit: number;
    itemCount: number;
    pageCount: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
  };
}

export interface DeleteSpaceMemberResponse {
  message: string;
}
