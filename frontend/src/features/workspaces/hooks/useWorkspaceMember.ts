"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { workspaceMemberService } from "../services";
import type {
  AddWorkspaceMemberDto,
  UpdateWorkspaceMemberDto,
  WorkspaceMemberQueryParams,
} from "../types";
import { WORKSPACE_QUERY_KEYS } from "./useWorkspace";

export const WORKSPACE_MEMBER_QUERY_KEYS = {
  all: ["workspace-members"] as const,
  workspace: (workspaceId: number) =>
    [...WORKSPACE_MEMBER_QUERY_KEYS.all, "workspace", workspaceId] as const,
  lists: (workspaceId: number) =>
    [...WORKSPACE_MEMBER_QUERY_KEYS.workspace(workspaceId), "list"] as const,
  list: (workspaceId: number, params?: WorkspaceMemberQueryParams) =>
    [...WORKSPACE_MEMBER_QUERY_KEYS.lists(workspaceId), params] as const,
  details: (workspaceId: number) =>
    [...WORKSPACE_MEMBER_QUERY_KEYS.workspace(workspaceId), "detail"] as const,
  detail: (workspaceId: number, userId: number) =>
    [...WORKSPACE_MEMBER_QUERY_KEYS.details(workspaceId), userId] as const,
};

/**
 * Hook lấy danh sách thành viên trong workspace (hỗ trợ tìm kiếm, lọc vai trò/trạng thái, phân trang)
 */
export function useWorkspaceMemberList(
  workspaceId?: number,
  params?: WorkspaceMemberQueryParams,
) {
  return useQuery({
    queryKey: WORKSPACE_MEMBER_QUERY_KEYS.list(workspaceId!, params),
    queryFn: () => workspaceMemberService.getMembers(workspaceId!, params),
    enabled: typeof workspaceId === "number" && workspaceId > 0,
  });
}

/**
 * Hook lấy thông tin chi tiết một thành viên trong workspace
 */
export function useWorkspaceMemberDetail(
  workspaceId?: number,
  userId?: number,
) {
  return useQuery({
    queryKey: WORKSPACE_MEMBER_QUERY_KEYS.detail(workspaceId!, userId!),
    queryFn: () => workspaceMemberService.getMemberDetail(workspaceId!, userId!),
    enabled:
      typeof workspaceId === "number" &&
      workspaceId > 0 &&
      typeof userId === "number" &&
      userId > 0,
  });
}

/**
 * Hook chính thao tác với thành viên của workspace (lấy chi tiết, thêm, cập nhật, xóa)
 */
export function useWorkspaceMember(workspaceId?: number, userId?: number) {
  const queryClient = useQueryClient();

  const memberQuery = useQuery({
    queryKey: WORKSPACE_MEMBER_QUERY_KEYS.detail(workspaceId!, userId!),
    queryFn: () => workspaceMemberService.getMemberDetail(workspaceId!, userId!),
    enabled:
      typeof workspaceId === "number" &&
      workspaceId > 0 &&
      typeof userId === "number" &&
      userId > 0,
  });

  const invalidateMemberQueries = (wsId: number, uId?: number) => {
    // Invalidate queries của workspace members
    queryClient.invalidateQueries({
      queryKey: WORKSPACE_MEMBER_QUERY_KEYS.workspace(wsId),
    });

    if (uId) {
      queryClient.invalidateQueries({
        queryKey: WORKSPACE_MEMBER_QUERY_KEYS.detail(wsId, uId),
      });
    }

    // Invalidate chi tiết workspace nếu có cache chứa members
    queryClient.invalidateQueries({
      queryKey: WORKSPACE_QUERY_KEYS.detail(wsId),
    });
    queryClient.invalidateQueries({
      queryKey: WORKSPACE_QUERY_KEYS.my(),
    });
  };

  const addMemberMutation = useMutation({
    mutationFn: ({
      workspaceId: targetWsId,
      dto,
    }: {
      workspaceId?: number;
      dto: AddWorkspaceMemberDto;
    }) => {
      const activeWsId = targetWsId ?? workspaceId;
      if (!activeWsId) {
        throw new Error("Workspace ID là bắt buộc khi thêm thành viên.");
      }
      return workspaceMemberService.addMember(activeWsId, dto);
    },
    onSuccess: (_, variables) => {
      const activeWsId = variables.workspaceId ?? workspaceId;
      if (activeWsId) {
        invalidateMemberQueries(activeWsId);
      }
    },
  });

  const updateMemberMutation = useMutation({
    mutationFn: ({
      workspaceId: targetWsId,
      userId: targetUserId,
      dto,
    }: {
      workspaceId?: number;
      userId?: number;
      dto: UpdateWorkspaceMemberDto;
    }) => {
      const activeWsId = targetWsId ?? workspaceId;
      const activeUserId = targetUserId ?? userId;
      if (!activeWsId) {
        throw new Error("Workspace ID là bắt buộc khi cập nhật thành viên.");
      }
      if (!activeUserId) {
        throw new Error("User ID là bắt buộc khi cập nhật thành viên.");
      }
      return workspaceMemberService.updateMember(activeWsId, activeUserId, dto);
    },
    onSuccess: (_, variables) => {
      const activeWsId = variables.workspaceId ?? workspaceId;
      const activeUserId = variables.userId ?? userId;
      if (activeWsId) {
        invalidateMemberQueries(activeWsId, activeUserId);
      }
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: ({
      workspaceId: targetWsId,
      userId: targetUserId,
    }: {
      workspaceId?: number;
      userId?: number;
    } = {}) => {
      const activeWsId = targetWsId ?? workspaceId;
      const activeUserId = targetUserId ?? userId;
      if (!activeWsId) {
        throw new Error("Workspace ID là bắt buộc khi xóa thành viên.");
      }
      if (!activeUserId) {
        throw new Error("User ID là bắt buộc khi xóa thành viên.");
      }
      return workspaceMemberService.removeMember(activeWsId, activeUserId);
    },
    onSuccess: (_, variables) => {
      const activeWsId = variables?.workspaceId ?? workspaceId;
      const activeUserId = variables?.userId ?? userId;
      if (activeWsId) {
        invalidateMemberQueries(activeWsId, activeUserId);
      }
    },
  });

  return {
    // Queries
    member: memberQuery.data,
    isLoadingMember: memberQuery.isLoading,
    memberError: memberQuery.error,
    refetchMember: memberQuery.refetch,

    // Mutations
    addMember: addMemberMutation.mutateAsync,
    isAdding: addMemberMutation.isPending,
    addError: addMemberMutation.error,

    updateMember: updateMemberMutation.mutateAsync,
    isUpdating: updateMemberMutation.isPending,
    updateError: updateMemberMutation.error,

    removeMember: removeMemberMutation.mutateAsync,
    isRemoving: removeMemberMutation.isPending,
    removeError: removeMemberMutation.error,
  };
}

