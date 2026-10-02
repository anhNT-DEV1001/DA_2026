import { apiClient } from "@/lib/axios";
import type {
  CreateRoleDto,
  PaginatedRoleResponse,
  RoleItem,
  RoleQueryParams,
  UpdateRoleDto,
} from "../types";

export const roleService = {
  getListRoles: async (
    params?: RoleQueryParams,
  ): Promise<PaginatedRoleResponse | RoleItem[]> => {
    return apiClient.get<unknown, PaginatedRoleResponse | RoleItem[]>(
      "/roles",
      {
        params,
      },
    );
  },

  getRoleById: async (id: number): Promise<RoleItem> => {
    return apiClient.get<unknown, RoleItem>(`/roles/${id}`);
  },

  createRole: async (dto: CreateRoleDto): Promise<RoleItem> => {
    return apiClient.post<unknown, RoleItem>("/roles", dto);
  },

  updateRole: async (id: number, dto: UpdateRoleDto): Promise<RoleItem> => {
    return apiClient.patch<unknown, RoleItem>(`/roles/${id}`, dto);
  },

  deleteRole: async (id: number): Promise<RoleItem> => {
    return apiClient.delete<unknown, RoleItem>(`/roles/${id}`);
  },

  /**
   * Lấy danh sách ID các permission được gán cho roleId
   */
  getRolePermissions: async (roleId: number): Promise<number[]> => {
    return apiClient.get<unknown, number[]>(`/roles/${roleId}/permissions`);
  },

  /**
   * Toggle 1 quyền cho roleId
   */
  toggleRolePermission: async (
    roleId: number,
    permissionId: number,
  ): Promise<{ assigned: boolean; roleId: number; permissionId: number }> => {
    return apiClient.post<
      unknown,
      { assigned: boolean; roleId: number; permissionId: number }
    >(`/roles/${roleId}/permissions/toggle`, { permissionId });
  },

  /**
   * Cập nhật đồng bộ danh sách permissionIds cho roleId
   */
  updateRolePermissions: async (
    roleId: number,
    permissionIds: number[],
  ): Promise<number[]> => {
    return apiClient.put<unknown, number[]>(`/roles/${roleId}/permissions`, {
      permissionIds,
    });
  },
};
