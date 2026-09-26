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
};
