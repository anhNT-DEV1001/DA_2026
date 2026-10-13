import { apiClient } from "@/lib/axios";
import type {
  AddWorkspaceMemberDto,
  CreateWorkspaceDto,
  DeleteWorkspaceMemberResponse,
  PaginatedWorkspaceMemberResponse,
  PaginatedWorkspaceResponse,
  UpdateWorkspaceDto,
  UpdateWorkspaceMemberDto,
  WorkspaceItem,
  WorkspaceMemberItem,
  WorkspaceMemberQueryParams,
  WorkspaceQueryParams,
} from "../types";

export const workspaceService = {
  /* ========================================================================= */
  /*                             WORKSPACE APIs                                */
  /* ========================================================================= */

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

  /* ========================================================================= */
  /*                          WORKSPACE MEMBERS APIs                           */
  /* ========================================================================= */

  /**
   * Lấy danh sách thành viên trong workspace (hỗ trợ tìm kiếm, lọc vai trò/trạng thái và phân trang)
   * GET /workspaces/:id/members
   */
  getMembers: async (
    workspaceId: number,
    params?: WorkspaceMemberQueryParams,
  ): Promise<PaginatedWorkspaceMemberResponse | WorkspaceMemberItem[]> => {
    return apiClient.get<
      unknown,
      PaginatedWorkspaceMemberResponse | WorkspaceMemberItem[]
    >(`/workspaces/${workspaceId}/members`, {
      params,
    });
  },

  /**
   * Lấy thông tin chi tiết một thành viên trong workspace
   * GET /workspaces/:id/members/:userId
   */
  getMemberDetail: async (
    workspaceId: number,
    userId: number,
  ): Promise<WorkspaceMemberItem> => {
    return apiClient.get<unknown, WorkspaceMemberItem>(
      `/workspaces/${workspaceId}/members/${userId}`,
    );
  },

  /**
   * Thêm thành viên mới vào workspace
   * POST /workspaces/:id/members
   */
  addMember: async (
    workspaceId: number,
    dto: AddWorkspaceMemberDto,
  ): Promise<WorkspaceMemberItem> => {
    return apiClient.post<unknown, WorkspaceMemberItem>(
      `/workspaces/${workspaceId}/members`,
      dto,
    );
  },

  /**
   * Cập nhật vai trò (role) hoặc trạng thái của thành viên trong workspace
   * PATCH /workspaces/:id/members/:userId
   */
  updateMember: async (
    workspaceId: number,
    userId: number,
    dto: UpdateWorkspaceMemberDto,
  ): Promise<WorkspaceMemberItem> => {
    return apiClient.patch<unknown, WorkspaceMemberItem>(
      `/workspaces/${workspaceId}/members/${userId}`,
      dto,
    );
  },

  /**
   * Xóa thành viên khỏi workspace
   * DELETE /workspaces/:id/members/:userId
   */
  removeMember: async (
    workspaceId: number,
    userId: number,
  ): Promise<DeleteWorkspaceMemberResponse> => {
    return apiClient.delete<unknown, DeleteWorkspaceMemberResponse>(
      `/workspaces/${workspaceId}/members/${userId}`,
    );
  },
};

/**
 * Service alias dành riêng cho các API quản lý thành viên Workspace
 */
export const workspaceMemberService = {
  getMembers: workspaceService.getMembers,
  getMemberDetail: workspaceService.getMemberDetail,
  addMember: workspaceService.addMember,
  updateMember: workspaceService.updateMember,
  removeMember: workspaceService.removeMember,
};
