import { apiClient } from "@/lib/axios";
import type {
  CreateMenuDto,
  MenuItem,
  MenuQueryParams,
  PaginatedMenuResponse,
  UpdateMenuDto,
} from "../types";

export const menuService = {
  getSidebarMenus: async (): Promise<MenuItem[]> => {
    return apiClient.get<unknown, MenuItem[]>("/menus/sidebar");
  },

  getListMenus: async (
    params?: MenuQueryParams,
  ): Promise<PaginatedMenuResponse | MenuItem[]> => {
    return apiClient.get<unknown, PaginatedMenuResponse | MenuItem[]>(
      "/menus",
      {
        params,
      },
    );
  },

  getMenuById: async (id: number): Promise<MenuItem> => {
    return apiClient.get<unknown, MenuItem>(`/menus/${id}`);
  },

  createMenu: async (dto: CreateMenuDto): Promise<MenuItem> => {
    return apiClient.post<unknown, MenuItem>("/menus", dto);
  },

  updateMenu: async (id: number, dto: UpdateMenuDto): Promise<MenuItem> => {
    return apiClient.patch<unknown, MenuItem>(`/menus/${id}`, dto);
  },

  deleteMenu: async (id: number): Promise<void> => {
    return apiClient.delete<unknown, void>(`/menus/${id}`);
  },
};
