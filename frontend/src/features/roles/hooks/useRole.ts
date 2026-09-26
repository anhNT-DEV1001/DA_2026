"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { roleService } from "../services";
import type { CreateRoleDto, RoleQueryParams, UpdateRoleDto } from "../types";

export const ROLE_QUERY_KEYS = {
  all: ["roles"] as const,
  lists: () => [...ROLE_QUERY_KEYS.all, "list"] as const,
  list: (params?: RoleQueryParams) =>
    [...ROLE_QUERY_KEYS.lists(), params] as const,
  details: () => [...ROLE_QUERY_KEYS.all, "detail"] as const,
  detail: (id: number) => [...ROLE_QUERY_KEYS.details(), id] as const,
};

export function useRoleList(params?: RoleQueryParams) {
  return useQuery({
    queryKey: ROLE_QUERY_KEYS.list(params),
    queryFn: () => roleService.getListRoles(params),
  });
}

export function useRole(id?: number) {
  const queryClient = useQueryClient();

  const roleQuery = useQuery({
    queryKey: ROLE_QUERY_KEYS.detail(id!),
    queryFn: () => roleService.getRoleById(id!),
    enabled: typeof id === "number" && id > 0,
  });

  const createMutation = useMutation({
    mutationFn: (dto: CreateRoleDto) => roleService.createRole(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ROLE_QUERY_KEYS.all });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id: roleId, dto }: { id: number; dto: UpdateRoleDto }) =>
      roleService.updateRole(roleId, dto),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ROLE_QUERY_KEYS.all });
      queryClient.invalidateQueries({
        queryKey: ROLE_QUERY_KEYS.detail(variables.id),
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (roleId: number) => roleService.deleteRole(roleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ROLE_QUERY_KEYS.all });
    },
  });

  return {
    // Queries
    role: roleQuery.data,
    isLoadingRole: roleQuery.isLoading,
    roleError: roleQuery.error,
    refetchRole: roleQuery.refetch,

    // Mutations
    createRole: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    createError: createMutation.error,

    updateRole: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    updateError: updateMutation.error,

    deleteRole: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
    deleteError: deleteMutation.error,
  };
}
