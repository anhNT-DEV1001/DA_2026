"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { masterdataService } from "../services";
import type {
  CreateMasterDataDto,
  MasterDataDto,
  UpdateMasterDataDto,
} from "../types";

export const MASTERDATA_QUERY_KEY = ["master-data"] as const;

export function useMasterDataGroups() {
  return useQuery({
    queryKey: [...MASTERDATA_QUERY_KEY, "groups"],
    queryFn: () => masterdataService.getGroups(),
  });
}

export function useMasterDataByGroup(
  group: string,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [...MASTERDATA_QUERY_KEY, group],
    queryFn: () => masterdataService.getByGroup(group),
    enabled: options?.enabled ?? Boolean(group),
  });
}

export function useCreateMasterData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateMasterDataDto | MasterDataDto) =>
      masterdataService.create(dto),
    onSuccess: (newData) => {
      queryClient.invalidateQueries({ queryKey: MASTERDATA_QUERY_KEY });
      if (newData?.group) {
        queryClient.invalidateQueries({
          queryKey: [...MASTERDATA_QUERY_KEY, newData.group],
        });
      }
    },
  });
}

export function useUpdateMasterData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      dto,
    }: {
      id: number;
      dto: UpdateMasterDataDto | MasterDataDto;
    }) => masterdataService.update(id, dto),
    onSuccess: (updatedData) => {
      queryClient.invalidateQueries({ queryKey: MASTERDATA_QUERY_KEY });
      if (updatedData?.group) {
        queryClient.invalidateQueries({
          queryKey: [...MASTERDATA_QUERY_KEY, updatedData.group],
        });
      }
    },
  });
}

export function useDeleteMasterData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => masterdataService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MASTERDATA_QUERY_KEY });
    },
  });
}

export function useMasterdata(group?: string) {
  const query = useMasterDataByGroup(group || "", {
    enabled: Boolean(group),
  });

  const createMutation = useCreateMasterData();
  const updateMutation = useUpdateMasterData();
  const deleteMutation = useDeleteMasterData();

  return {
    // Single group query state (if group param passed)
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,

    // Mutations
    createMutation,
    updateMutation,
    deleteMutation,

    // Shorthand mutateAsync methods
    createMasterData: createMutation.mutateAsync,
    updateMasterData: updateMutation.mutateAsync,
    deleteMasterData: deleteMutation.mutateAsync,

    // Status flags
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
