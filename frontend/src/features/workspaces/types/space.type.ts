export interface SpaceItem {
  id: number;
  name: string;
  description: string | null;
  workspaceId: number;
  displayOrder: number;
  createdAt?: string | null;
  updatedAt?: string | null;
  deletedAt?: string | null;
  createdBy?: number | null;
  updatedBy?: number | null;
  deletedBy?: number | null;
}

export interface CreateSpaceDto {
  name: string;
  description?: string;
  displayOrder?: number;
}

export interface UpdateSpaceDto {
  name?: string;
  description?: string;
  displayOrder?: number;
}

export interface SpaceQueryParams {
  search?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedSpaceResponse {
  items: SpaceItem[];
  meta: {
    page: number;
    limit: number;
    itemCount: number;
    pageCount: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
  };
}
