"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { spaceMemberService } from "../services";
import type { AddSpaceMemberDto, SpaceMemberQueryParams } from "../types";

export const SPACE_MEMBER_QUERY_KEYS = {
  all: ["space-members"] as const,
  space: (workspaceId: number, spaceId: number) =>
    [...SPACE_MEMBER_QUERY_KEYS.all, "workspace", workspaceId, "space", spaceId] as const,
  lists: (workspaceId: number, spaceId: number) =>
    [...SPACE_MEMBER_QUERY_KEYS.space(workspaceId, spaceId), "list"] as const,
  list: (workspaceId: number, spaceId: number, params?: SpaceMemberQueryParams) =>
    [...SPACE_MEMBER_QUERY_KEYS.lists(workspaceId, spaceId), params] as const,
  details: (workspaceId: number, spaceId: number) =>
    [...SPACE_MEMBER_QUERY_KEYS.space(workspaceId, spaceId), "detail"] as const,
  detail: (workspaceId: number, spaceId: number, memberId: number) =>
    [...SPACE_MEMBER_QUERY_KEYS.details(workspaceId, spaceId), memberId] as const,
};

/**
 * Hook lấy danh sách thành viên trong space (hỗ trợ tìm kiếm, phân trang)
 */
export function useSpaceMemberList(
  workspaceId?: number,
  spaceId?: number,
  params?: SpaceMemberQueryParams,
) {
  return useQuery({
    queryKey: SPACE_MEMBER_QUERY_KEYS.list(workspaceId!, spaceId!, params),
    queryFn: () =>
      spaceMemberService.getSpaceMembers(workspaceId!, spaceId!, params),
    enabled:
      typeof workspaceId === "number" &&
      workspaceId > 0 &&
      typeof spaceId === "number" &&
      spaceId > 0,
  });
}

/**
 * Hook lấy chi tiết một thành viên trong space
 */
export function useSpaceMemberDetail(
  workspaceId?: number,
  spaceId?: number,
  memberId?: number,
) {
  return useQuery({
    queryKey: SPACE_MEMBER_QUERY_KEYS.detail(workspaceId!, spaceId!, memberId!),
    queryFn: () =>
      spaceMemberService.getSpaceMemberDetail(workspaceId!, spaceId!, memberId!),
    enabled:
      typeof workspaceId === "number" &&
      workspaceId > 0 &&
      typeof spaceId === "number" &&
      spaceId > 0 &&
      typeof memberId === "number" &&
      memberId > 0,
  });
}

/**
 * Hook chính quản lý thành viên trong space (thêm, xóa)
 */
export function useSpaceMember(
  workspaceId?: number,
  spaceId?: number,
  memberId?: number,
) {
  const queryClient = useQueryClient();

  const memberQuery = useQuery({
    queryKey: SPACE_MEMBER_QUERY_KEYS.detail(workspaceId!, spaceId!, memberId!),
    queryFn: () =>
      spaceMemberService.getSpaceMemberDetail(workspaceId!, spaceId!, memberId!),
    enabled:
      typeof workspaceId === "number" &&
      workspaceId > 0 &&
      typeof spaceId === "number" &&
      spaceId > 0 &&
      typeof memberId === "number" &&
      memberId > 0,
  });

  const invalidateSpaceMemberQueries = (wsId: number, sId: number) => {
    queryClient.invalidateQueries({
      queryKey: SPACE_MEMBER_QUERY_KEYS.space(wsId, sId),
    });
  };

  const addMemberMutation = useMutation({
    mutationFn: ({
      workspaceId: targetWsId,
      spaceId: targetSpaceId,
      dto,
    }: {
      workspaceId?: number;
      spaceId?: number;
      dto: AddSpaceMemberDto;
    }) => {
      const activeWsId = targetWsId ?? workspaceId;
      const activeSpaceId = targetSpaceId ?? spaceId;
      if (!activeWsId) {
        throw new Error("Workspace ID là bắt buộc khi thêm thành viên vào space.");
      }
      if (!activeSpaceId) {
        throw new Error("Space ID là bắt buộc khi thêm thành viên vào space.");
      }
      return spaceMemberService.addSpaceMember(activeWsId, activeSpaceId, dto);
    },
    onSuccess: (_, variables) => {
      const activeWsId = variables.workspaceId ?? workspaceId;
      const activeSpaceId = variables.spaceId ?? spaceId;
      if (activeWsId && activeSpaceId) {
        invalidateSpaceMemberQueries(activeWsId, activeSpaceId);
      }
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: ({
      workspaceId: targetWsId,
      spaceId: targetSpaceId,
      memberId: targetMemberId,
    }: {
      workspaceId?: number;
      spaceId?: number;
      memberId?: number;
    } = {}) => {
      const activeWsId = targetWsId ?? workspaceId;
      const activeSpaceId = targetSpaceId ?? spaceId;
      const activeMemberId = targetMemberId ?? memberId;
      if (!activeWsId) {
        throw new Error("Workspace ID là bắt buộc khi xóa thành viên khỏi space.");
      }
      if (!activeSpaceId) {
        throw new Error("Space ID là bắt buộc khi xóa thành viên khỏi space.");
      }
      if (!activeMemberId) {
        throw new Error("Member ID là bắt buộc khi xóa thành viên khỏi space.");
      }
      return spaceMemberService.removeSpaceMember(
        activeWsId,
        activeSpaceId,
        activeMemberId,
      );
    },
    onSuccess: (_, variables) => {
      const activeWsId = variables?.workspaceId ?? workspaceId;
      const activeSpaceId = variables?.spaceId ?? spaceId;
      if (activeWsId && activeSpaceId) {
        invalidateSpaceMemberQueries(activeWsId, activeSpaceId);
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

    removeMember: removeMemberMutation.mutateAsync,
    isRemoving: removeMemberMutation.isPending,
    removeError: removeMemberMutation.error,
  };
}
