export interface SpaceItem {
  id: number;
  name: string;
  description: string | null;
  /** Tên icon Lucide (VD: LayoutList) */
  icon: string | null;
  workspaceId: number;
  displayOrder: number;
  createdAt?: string | null;
  updatedAt?: string | null;
  deletedAt?: string | null;
  createdBy?: number | null;
  updatedBy?: number | null;
  deletedBy?: number | null;
}

export interface SpaceStatusInput {
  code: string;
  name: string;
  isCompleted?: boolean;
}

export interface CreateSpaceDto {
  name: string;
  description?: string;
  icon?: string;
  displayOrder?: number;
  /** Trạng thái task ban đầu theo thứ tự; bỏ trống thì backend dùng bộ mặc định */
  statuses?: SpaceStatusInput[];
}

export interface UpdateSpaceDto {
  name?: string;
  description?: string;
  /** null để xóa icon */
  icon?: string | null;
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
