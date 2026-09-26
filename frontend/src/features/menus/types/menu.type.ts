export interface MenuItem {
  id: number;
  name: string;
  route: string | null;
  icon: string | null;
  alias: string;
  parentId: number | null;
  displayOrder: number;
  isSideBarDisplay: boolean;
  isActive: boolean;
  children?: MenuItem[];
  createdAt?: string;
  updatedAt?: string;
}

export type Menu = MenuItem;

export interface CreateMenuDto {
  name: string;
  route?: string;
  icon?: string;
  alias: string;
  parentId?: number;
  displayOrder?: number;
  isSideBarDisplay?: boolean;
}

export interface UpdateMenuDto extends Partial<CreateMenuDto> {
  isActive?: boolean;
}

export interface MenuQueryParams {
  name?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export interface PaginatedMenuResponse {
  items: MenuItem[];
  meta: {
    page: number;
    limit: number;
    itemCount: number;
    pageCount: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
  };
}
