import { apiClient } from "@/lib/axios";
import type {
  CreateWorkspaceDto,
  PaginatedWorkspaceResponse,
  UpdateWorkspaceDto,
  WorkspaceItem,
  WorkspaceQueryParams,
} from "../types";

export const workspaceService = {
  /**
   * Lấy danh sách workspace của người dùng hiện tại (là chủ sở hữu hoặc thành viên)
   * GET /workspaces/my
   */
  getMyWorkspaces: async (): Promise<WorkspaceItem[]> => {
    return apiClient.get<unknown, WorkspaceItem[]>("/workspaces/my");
  },

  /**
   * Lấy danh sách workspace (hỗ trợ tìm kiếm, lọc theo mode/ownerId và phân trang)
   * GET /workspaces
   */
  getWorkspaces: async (
    params?: WorkspaceQueryParams,
  ): Promise<PaginatedWorkspaceResponse | WorkspaceItem[]> => {
    return apiClient.get<unknown, PaginatedWorkspaceResponse | WorkspaceItem[]>(
      "/workspaces",
      {
        params,
      },
    );
  },

  /**
   * Lấy chi tiết workspace theo ID
   * GET /workspaces/:id
   */
  getWorkspaceById: async (id: number): Promise<WorkspaceItem> => {
    return apiClient.get<unknown, WorkspaceItem>(`/workspaces/${id}`);
  },

  /**
   * Lấy chi tiết workspace theo slug
   * GET /workspaces/slug/:slug
   */
  getWorkspaceBySlug: async (slug: string): Promise<WorkspaceItem> => {
    return apiClient.get<unknown, WorkspaceItem>(`/workspaces/slug/${slug}`);
  },

  /**
   * Tạo mới một workspace
   * POST /workspaces
   */
  createWorkspace: async (dto: CreateWorkspaceDto): Promise<WorkspaceItem> => {
    return apiClient.post<unknown, WorkspaceItem>("/workspaces", dto);
  },

  /**
   * Cập nhật thông tin workspace theo ID
   * PATCH /workspaces/:id
   */
  updateWorkspace: async (
    id: number,
    dto: UpdateWorkspaceDto,
  ): Promise<WorkspaceItem> => {
    return apiClient.patch<unknown, WorkspaceItem>(`/workspaces/${id}`, dto);
  },

  /**
   * Xóa mềm (soft-delete) workspace theo ID
   * DELETE /workspaces/:id
   */
  deleteWorkspace: async (id: number): Promise<WorkspaceItem> => {
    return apiClient.delete<unknown, WorkspaceItem>(`/workspaces/${id}`);
  },
};
