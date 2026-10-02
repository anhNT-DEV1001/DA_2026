"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { workspaceService } from "../services";
import type {
  CreateWorkspaceDto,
  UpdateWorkspaceDto,
  WorkspaceQueryParams,
} from "../types";

export const WORKSPACE_QUERY_KEYS = {
  all: ["workspaces"] as const,
  my: () => [...WORKSPACE_QUERY_KEYS.all, "my"] as const,
  lists: () => [...WORKSPACE_QUERY_KEYS.all, "list"] as const,
  list: (params?: WorkspaceQueryParams) =>
    [...WORKSPACE_QUERY_KEYS.lists(), params] as const,
  details: () => [...WORKSPACE_QUERY_KEYS.all, "detail"] as const,
  detail: (id: number) => [...WORKSPACE_QUERY_KEYS.details(), id] as const,
  detailSlug: (slug: string) =>
    [...WORKSPACE_QUERY_KEYS.details(), "slug", slug] as const,
};

/**
 * Hook lấy danh sách workspace của người dùng hiện tại
 */
export function useMyWorkspaces() {
  return useQuery({
    queryKey: WORKSPACE_QUERY_KEYS.my(),
    queryFn: () => workspaceService.getMyWorkspaces(),
  });
}

/**
 * Hook lấy danh sách workspace (có tìm kiếm, lọc và phân trang)
 */
export function useWorkspaceList(params?: WorkspaceQueryParams) {
  return useQuery({
    queryKey: WORKSPACE_QUERY_KEYS.list(params),
    queryFn: () => workspaceService.getWorkspaces(params),
  });
}

/**
 * Hook lấy chi tiết workspace theo slug
 */
export function useWorkspaceBySlug(slug?: string) {
  return useQuery({
    queryKey: WORKSPACE_QUERY_KEYS.detailSlug(slug!),
    queryFn: () => workspaceService.getWorkspaceBySlug(slug!),
    enabled: Boolean(slug),
  });
}

/**
 * Hook chính thao tác với workspace (lấy chi tiết theo ID, tạo mới, cập nhật, xóa)
 */
export function useWorkspace(id?: number) {
  const queryClient = useQueryClient();

  const workspaceQuery = useQuery({
    queryKey: WORKSPACE_QUERY_KEYS.detail(id!),
    queryFn: () => workspaceService.getWorkspaceById(id!),
    enabled: typeof id === "number" && id > 0,
  });

  const createMutation = useMutation({
    mutationFn: (dto: CreateWorkspaceDto) =>
      workspaceService.createWorkspace(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WORKSPACE_QUERY_KEYS.all });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id: workspaceId,
      dto,
    }: {
      id: number;
      dto: UpdateWorkspaceDto;
    }) => workspaceService.updateWorkspace(workspaceId, dto),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: WORKSPACE_QUERY_KEYS.all });
      queryClient.invalidateQueries({
        queryKey: WORKSPACE_QUERY_KEYS.detail(variables.id),
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (workspaceId: number) =>
      workspaceService.deleteWorkspace(workspaceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WORKSPACE_QUERY_KEYS.all });
    },
  });

  return {
    // Queries
    workspace: workspaceQuery.data,
    isLoadingWorkspace: workspaceQuery.isLoading,
    workspaceError: workspaceQuery.error,
    refetchWorkspace: workspaceQuery.refetch,

    // Mutations
    createWorkspace: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    createError: createMutation.error,

    updateWorkspace: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    updateError: updateMutation.error,

    deleteWorkspace: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
    deleteError: deleteMutation.error,
  };
}
