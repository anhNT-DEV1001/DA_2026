import { apiClient } from "@/lib/axios";
import type {
  AddWorkspaceMemberDto,
  CreateWorkspaceDto,
  CreateSpaceDto,
  DeleteWorkspaceMemberResponse,
  PaginatedWorkspaceMemberResponse,
  PaginatedWorkspaceResponse,
  PaginatedWorkspaceSearchResponse,
  PaginatedSpaceResponse,
  SpaceItem,
  SpaceQueryParams,
  UpdateSpaceDto,
  UpdateWorkspaceDto,
  UpdateWorkspaceMemberDto,
  WorkspaceItem,
  WorkspaceMemberItem,
  WorkspaceMemberQueryParams,
  WorkspaceQueryParams,
  WorkspaceSearchParams,
  AddSpaceMemberDto,
  DeleteSpaceMemberResponse,
  PaginatedSpaceMemberResponse,
  SpaceMemberItem,
  SpaceMemberQueryParams,
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
   * Tìm kiếm workspace để đăng ký tham gia (kèm trạng thái tham gia của user hiện tại)
   * GET /workspaces/search
   */
  searchWorkspaces: async (
    params?: WorkspaceSearchParams,
  ): Promise<PaginatedWorkspaceSearchResponse> => {
    return apiClient.get<unknown, PaginatedWorkspaceSearchResponse>(
      "/workspaces/search",
      { params },
    );
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

  /**
   * Duyệt thành viên vào workspace (chỉ dành cho Owner)
   * PATCH /workspaces/:id/members/:userId/approve
   */
  approveMember: async (
    workspaceId: number,
    userId: number,
  ): Promise<WorkspaceMemberItem> => {
    return apiClient.patch<unknown, WorkspaceMemberItem>(
      `/workspaces/${workspaceId}/members/${userId}/approve`,
    );
  },

  /**
   * Từ chối yêu cầu tham gia workspace của thành viên (chỉ dành cho Owner)
   * PATCH /workspaces/:id/members/:userId/reject
   */
  rejectMember: async (
    workspaceId: number,
    userId: number,
  ): Promise<{ message: string }> => {
    return apiClient.patch<unknown, { message: string }>(
      `/workspaces/${workspaceId}/members/${userId}/reject`,
    );
  },

  /* ========================================================================= */
  /*                                Space APIs                                 */
  /* ========================================================================= */

  /**
   * Lấy danh sách space trong workspace (hỗ trợ tìm kiếm và phân trang)
   * GET /workspaces/:id/spaces
   */
  getSpaces: async (
    workspaceId: number,
    params?: SpaceQueryParams,
  ): Promise<PaginatedSpaceResponse | SpaceItem[]> => {
    return apiClient.get<unknown, PaginatedSpaceResponse | SpaceItem[]>(
      `/workspaces/${workspaceId}/spaces`,
      { params },
    );
  },

  /**
   * Lấy chi tiết một space
   * GET /workspaces/:id/spaces/:spaceId
   */
  getSpaceById: async (
    workspaceId: number,
    spaceId: number,
  ): Promise<SpaceItem> => {
    return apiClient.get<unknown, SpaceItem>(
      `/workspaces/${workspaceId}/spaces/${spaceId}`,
    );
  },

  /**
   * Lấy danh sách space mà người dùng hiện tại đang tham gia trong workspace
   * GET /workspaces/:id/spaces/my
   */
  getMySpacesInWorkspace: async (workspaceId: number): Promise<SpaceItem[]> => {
    return apiClient.get<unknown, SpaceItem[]>(
      `/workspaces/${workspaceId}/spaces/my`,
    );
  },

  /**
   * Tạo mới space trong workspace
   * POST /workspaces/:id/spaces
   */
  createSpace: async (
    workspaceId: number,
    dto: CreateSpaceDto,
  ): Promise<SpaceItem> => {
    return apiClient.post<unknown, SpaceItem>(
      `/workspaces/${workspaceId}/spaces`,
      dto,
    );
  },

  /**
   * Cập nhật thông tin space
   * PATCH /workspaces/:id/spaces/:spaceId
   */
  updateSpace: async (
    workspaceId: number,
    spaceId: number,
    dto: UpdateSpaceDto,
  ): Promise<SpaceItem> => {
    return apiClient.patch<unknown, SpaceItem>(
      `/workspaces/${workspaceId}/spaces/${spaceId}`,
      dto,
    );
  },

  /**
   * Xóa mềm space
   * DELETE /workspaces/:id/spaces/:spaceId
   */
  deleteSpace: async (
    workspaceId: number,
    spaceId: number,
  ): Promise<SpaceItem> => {
    return apiClient.delete<unknown, SpaceItem>(
      `/workspaces/${workspaceId}/spaces/${spaceId}`,
    );
  },

  /* ========================================================================= */
  /*                            Space Members APIs                              */
  /* ========================================================================= */

  /**
   * Lấy danh sách thành viên trong space (hỗ trợ tìm kiếm và phân trang)
   * GET /workspaces/:id/spaces/:spaceId/members
   */
  getSpaceMembers: async (
    workspaceId: number,
    spaceId: number,
    params?: SpaceMemberQueryParams,
  ): Promise<PaginatedSpaceMemberResponse | SpaceMemberItem[]> => {
    return apiClient.get<
      unknown,
      PaginatedSpaceMemberResponse | SpaceMemberItem[]
    >(`/workspaces/${workspaceId}/spaces/${spaceId}/members`, { params });
  },

  /**
   * Lấy chi tiết một thành viên trong space
   * GET /workspaces/:id/spaces/:spaceId/members/:memberId
   */
  getSpaceMemberDetail: async (
    workspaceId: number,
    spaceId: number,
    memberId: number,
  ): Promise<SpaceMemberItem> => {
    return apiClient.get<unknown, SpaceMemberItem>(
      `/workspaces/${workspaceId}/spaces/${spaceId}/members/${memberId}`,
    );
  },

  /**
   * Thêm thành viên workspace vào space
   * POST /workspaces/:id/spaces/:spaceId/members
   */
  addSpaceMember: async (
    workspaceId: number,
    spaceId: number,
    dto: AddSpaceMemberDto,
  ): Promise<SpaceMemberItem> => {
    return apiClient.post<unknown, SpaceMemberItem>(
      `/workspaces/${workspaceId}/spaces/${spaceId}/members`,
      dto,
    );
  },

  /**
   * Xóa thành viên khỏi space
   * DELETE /workspaces/:id/spaces/:spaceId/members/:memberId
   */
  removeSpaceMember: async (
    workspaceId: number,
    spaceId: number,
    memberId: number,
  ): Promise<DeleteSpaceMemberResponse> => {
    return apiClient.delete<unknown, DeleteSpaceMemberResponse>(
      `/workspaces/${workspaceId}/spaces/${spaceId}/members/${memberId}`,
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
  approveMember: workspaceService.approveMember,
  rejectMember: workspaceService.rejectMember,
};

/**
 * Service alias dành riêng cho các API quản lý thành viên Space
 */
export const spaceMemberService = {
  getSpaceMembers: workspaceService.getSpaceMembers,
  getSpaceMemberDetail: workspaceService.getSpaceMemberDetail,
  addSpaceMember: workspaceService.addSpaceMember,
  removeSpaceMember: workspaceService.removeSpaceMember,
};
