"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { workspaceService } from "../services";
import type { CreateSpaceDto, SpaceQueryParams, UpdateSpaceDto } from "../types";

export const SPACE_QUERY_KEYS = {
  all: (workspaceId: number) => ["workspaces", workspaceId, "spaces"] as const,
  lists: (workspaceId: number) =>
    [...SPACE_QUERY_KEYS.all(workspaceId), "list"] as const,
  list: (workspaceId: number, params?: SpaceQueryParams) =>
    [...SPACE_QUERY_KEYS.lists(workspaceId), params] as const,
  details: (workspaceId: number) =>
    [...SPACE_QUERY_KEYS.all(workspaceId), "detail"] as const,
  detail: (workspaceId: number, spaceId: number) =>
    [...SPACE_QUERY_KEYS.details(workspaceId), spaceId] as const,
};

/**
 * Hook lấy danh sách space trong một workspace
 */
export function useSpaceList(workspaceId: number, params?: SpaceQueryParams) {
  return useQuery({
    queryKey: SPACE_QUERY_KEYS.list(workspaceId, params),
    queryFn: () => workspaceService.getSpaces(workspaceId, params),
    enabled: workspaceId > 0,
  });
}

/**
 * Hook thao tác CRUD với space (lấy chi tiết, tạo mới, cập nhật, xóa)
 */
export function useSpace(workspaceId: number, spaceId?: number) {
  const queryClient = useQueryClient();

  const spaceQuery = useQuery({
    queryKey: SPACE_QUERY_KEYS.detail(workspaceId, spaceId!),
    queryFn: () => workspaceService.getSpaceById(workspaceId, spaceId!),
    enabled: workspaceId > 0 && typeof spaceId === "number" && spaceId > 0,
  });

  const createMutation = useMutation({
    mutationFn: (dto: CreateSpaceDto) =>
      workspaceService.createSpace(workspaceId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: SPACE_QUERY_KEYS.all(workspaceId),
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: UpdateSpaceDto }) =>
      workspaceService.updateSpace(workspaceId, id, dto),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: SPACE_QUERY_KEYS.all(workspaceId),
      });
      queryClient.invalidateQueries({
        queryKey: SPACE_QUERY_KEYS.detail(workspaceId, variables.id),
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => workspaceService.deleteSpace(workspaceId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: SPACE_QUERY_KEYS.all(workspaceId),
      });
    },
  });

  return {
    // Query
    space: spaceQuery.data,
    isLoadingSpace: spaceQuery.isLoading,
    spaceError: spaceQuery.error,
    refetchSpace: spaceQuery.refetch,

    // Mutations
    createSpace: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    createError: createMutation.error,

    updateSpace: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    updateError: updateMutation.error,

    deleteSpace: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
    deleteError: deleteMutation.error,
  };
}
