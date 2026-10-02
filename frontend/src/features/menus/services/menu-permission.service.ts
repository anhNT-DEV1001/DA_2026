import { apiClient } from "@/lib/axios";
import type {
  CreatePermissionDto,
  PaginatedPermissionResponse,
  PermissionItem,
  PermissionQueryParams,
  UpdatePermissionDto,
} from "../types";

export const menuPermissionService = {
  /**
   * Lấy danh sách permission (có lọc và phân trang)
   */
  getListPermissions: async (
    params?: PermissionQueryParams,
  ): Promise<PaginatedPermissionResponse | PermissionItem[]> => {
    return apiClient.get<
      unknown,
      PaginatedPermissionResponse | PermissionItem[]
    >("/permissions", { params });
  },

  /**
   * Lấy danh sách permission thuộc về 1 Menu ID
   */
  getPermissionInMenu: async (menuId: number): Promise<PermissionItem[]> => {
    return apiClient.get<unknown, PermissionItem[]>(
      `/permissions/menu/${menuId}`,
    );
  },

  /**
   * Lấy chi tiết 1 permission theo ID
   */
  getPermissionById: async (id: number): Promise<PermissionItem> => {
    return apiClient.get<unknown, PermissionItem>(`/permissions/${id}`);
  },

  /**
   * Tạo permission mới
   */
  createPermission: async (
    dto: CreatePermissionDto,
  ): Promise<PermissionItem> => {
    return apiClient.post<unknown, PermissionItem>("/permissions", dto);
  },

  /**
   * Cập nhật permission theo ID
   */
  updatePermission: async (
    id: number,
    dto: UpdatePermissionDto,
  ): Promise<PermissionItem> => {
    return apiClient.patch<unknown, PermissionItem>(`/permissions/${id}`, dto);
  },

  /**
   * Xóa permission theo ID
   */
  deletePermission: async (id: number): Promise<PermissionItem | void> => {
    return apiClient.delete<unknown, PermissionItem | void>(
      `/permissions/${id}`,
    );
  },

  /**
   * Lấy ma trận cây Menu và các Permission tương ứng (dùng cho phân quyền)
   */
  getMenuPermissionMatrix: async () => {
    return apiClient.get<unknown, any[]>("/permissions/matrix");
  },
};
