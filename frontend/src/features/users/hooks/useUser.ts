"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { userService } from "../services";
import type { CreateUserDto, UpdateUserDto, UserQueryParams } from "../types";

export const USER_QUERY_KEYS = {
  all: ["users"] as const,
  lists: () => [...USER_QUERY_KEYS.all, "list"] as const,
  list: (params?: UserQueryParams) =>
    [...USER_QUERY_KEYS.lists(), params] as const,
  details: () => [...USER_QUERY_KEYS.all, "detail"] as const,
  detail: (id: number) => [...USER_QUERY_KEYS.details(), id] as const,
};

export function useUserList(params?: UserQueryParams) {
  return useQuery({
    queryKey: USER_QUERY_KEYS.list(params),
    queryFn: () => userService.getListUsers(params),
  });
}

export function useUser(id?: number) {
  const queryClient = useQueryClient();

  const userQuery = useQuery({
    queryKey: USER_QUERY_KEYS.detail(id!),
    queryFn: () => userService.getUserById(id!),
    enabled: typeof id === "number" && id > 0,
  });

  const createMutation = useMutation({
    mutationFn: (dto: CreateUserDto | FormData) => userService.createUser(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USER_QUERY_KEYS.all });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id: userId,
      dto,
    }: {
      id: number;
      dto: UpdateUserDto | FormData;
    }) => userService.updateUser(userId, dto),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: USER_QUERY_KEYS.all });
      queryClient.invalidateQueries({
        queryKey: USER_QUERY_KEYS.detail(variables.id),
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (userId: number) => userService.deleteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USER_QUERY_KEYS.all });
    },
  });

  return {
    // Queries
    user: userQuery.data,
    isLoadingUser: userQuery.isLoading,
    userError: userQuery.error,
    refetchUser: userQuery.refetch,

    // Mutations
    createUser: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    createError: createMutation.error,

    updateUser: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    updateError: updateMutation.error,

    deleteUser: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
    deleteError: deleteMutation.error,
  };
}
