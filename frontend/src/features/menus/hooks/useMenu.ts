"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { menuService } from "../services";
import type { CreateMenuDto, MenuQueryParams, UpdateMenuDto } from "../types";

export const MENU_QUERY_KEYS = {
  all: ["menus"] as const,
  sidebar: ["menus", "sidebar"] as const,
  list: (params?: MenuQueryParams) => ["menus", "list", params] as const,
  detail: (id: number) => ["menus", "detail", id] as const,
};

export function useSidebarMenus() {
  return useQuery({
    queryKey: MENU_QUERY_KEYS.sidebar,
    queryFn: () => menuService.getSidebarMenus(),
    staleTime: 1000 * 30, // 30s
  });
}

export function useMenuList(params?: MenuQueryParams) {
  return useQuery({
    queryKey: MENU_QUERY_KEYS.list(params),
    queryFn: () => menuService.getListMenus(params),
  });
}

export function useMenu(id?: number) {
  const queryClient = useQueryClient();

  const menuQuery = useQuery({
    queryKey: MENU_QUERY_KEYS.detail(id!),
    queryFn: () => menuService.getMenuById(id!),
    enabled: typeof id === "number" && id > 0,
  });

  const createMutation = useMutation({
    mutationFn: (dto: CreateMenuDto) => menuService.createMenu(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MENU_QUERY_KEYS.all });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id: menuId, dto }: { id: number; dto: UpdateMenuDto }) =>
      menuService.updateMenu(menuId, dto),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: MENU_QUERY_KEYS.all });
      queryClient.invalidateQueries({
        queryKey: MENU_QUERY_KEYS.detail(variables.id),
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (menuId: number) => menuService.deleteMenu(menuId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MENU_QUERY_KEYS.all });
    },
  });

  return {
    // Queries
    menu: menuQuery.data,
    isLoadingMenu: menuQuery.isLoading,
    menuError: menuQuery.error,
    refetchMenu: menuQuery.refetch,

    // Mutations
    createMenu: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    createError: createMutation.error,

    updateMenu: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    updateError: updateMutation.error,

    deleteMenu: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
    deleteError: deleteMutation.error,
  };
}
