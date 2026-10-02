"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { menuPermissionService } from "../services";
import type {
  CreatePermissionDto,
  PermissionQueryParams,
  UpdatePermissionDto,
} from "../types";

export const PERMISSION_QUERY_KEYS = {
  all: ["permissions"] as const,
  list: (params?: PermissionQueryParams) =>
    ["permissions", "list", params] as const,
  inMenu: (menuId?: number) => ["permissions", "menu", menuId] as const,
  detail: (id?: number) => ["permissions", "detail", id] as const,
  matrix: ["permissions", "matrix"] as const,
};

export function useMenuPermissionMatrix() {
  return useQuery({
    queryKey: PERMISSION_QUERY_KEYS.matrix,
    queryFn: () => menuPermissionService.getMenuPermissionMatrix(),
  });
}

export function usePermissionList(params?: PermissionQueryParams) {
  return useQuery({
    queryKey: PERMISSION_QUERY_KEYS.list(params),
    queryFn: () => menuPermissionService.getListPermissions(params),
  });
}

export function usePermissionsInMenu(menuId?: number) {
  return useQuery({
    queryKey: PERMISSION_QUERY_KEYS.inMenu(menuId),
    queryFn: () => menuPermissionService.getPermissionInMenu(menuId!),
    enabled: typeof menuId === "number" && menuId > 0,
  });
}

export function usePermissionDetail(id?: number) {
  return useQuery({
    queryKey: PERMISSION_QUERY_KEYS.detail(id),
    queryFn: () => menuPermissionService.getPermissionById(id!),
    enabled: typeof id === "number" && id > 0,
  });
}

export function useMenuPermission(menuId?: number) {
  const queryClient = useQueryClient();

  const permissionsQuery = useQuery({
    queryKey: PERMISSION_QUERY_KEYS.inMenu(menuId),
    queryFn: () => menuPermissionService.getPermissionInMenu(menuId!),
    enabled: typeof menuId === "number" && menuId > 0,
  });

  const createMutation = useMutation({
    mutationFn: (dto: CreatePermissionDto) =>
      menuPermissionService.createPermission(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PERMISSION_QUERY_KEYS.all });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: UpdatePermissionDto }) =>
      menuPermissionService.updatePermission(id, dto),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: PERMISSION_QUERY_KEYS.all });
      queryClient.invalidateQueries({
        queryKey: PERMISSION_QUERY_KEYS.detail(variables.id),
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => menuPermissionService.deletePermission(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PERMISSION_QUERY_KEYS.all });
    },
  });

  return {
    // Queries
    permissions: permissionsQuery.data ?? [],
    isLoadingPermissions: permissionsQuery.isLoading,
    permissionsError: permissionsQuery.error,
    refetchPermissions: permissionsQuery.refetch,

    // Mutations
    createPermission: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    createError: createMutation.error,

    updatePermission: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    updateError: updateMutation.error,

    deletePermission: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
    deleteError: deleteMutation.error,
  };
}
