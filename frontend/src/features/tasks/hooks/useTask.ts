"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { taskService } from "../services";
import type { TaskFilters, TaskInput } from "../types";

type Scope = readonly unknown[];
export const TASK_QUERY_KEYS = {
  all: ["tasks"] as const,
  workspace: (userId: number | undefined, workspaceId: number) =>
    [...TASK_QUERY_KEYS.all, userId, workspaceId] as const,
  list: (scope: Scope, filters: TaskFilters, view: "list" | "gantt" = "list") =>
    [...scope, view, filters] as const,
  statuses: (scope: Scope) => [...scope, "statuses"] as const,
  detail: (scope: Scope, id: number | null) =>
    [...scope, "detail", id] as const,
  history: (scope: Scope, id: number, page: number) =>
    [...scope, "activities", id, page] as const,
  feed: (scope: Scope, page: number) => [...scope, "feed", page] as const,
};

export function useTaskList(
  workspaceId: number,
  scope: Scope,
  filters: TaskFilters,
  enabled = true,
  view: "list" | "gantt" = "list",
) {
  return useQuery({
    queryKey: TASK_QUERY_KEYS.list(scope, filters, view),
    queryFn: () => taskService.list(workspaceId, filters),
    enabled,
  });
}

export function useTaskStatuses(
  workspaceId: number,
  spaceIdOrScope: number | Scope,
  scopeOrEnabled?: Scope | boolean,
  enabled = true,
) {
  // Overload: (workspaceId, scope, enabled?) — legacy callers without spaceId
  // Overload: (workspaceId, spaceId, scope, enabled?)
  const hasSpaceId = typeof spaceIdOrScope === "number";
  const spaceId = hasSpaceId ? (spaceIdOrScope as number) : 0;
  const scope = hasSpaceId
    ? (scopeOrEnabled as Scope)
    : (spaceIdOrScope as Scope);
  const isEnabled = hasSpaceId
    ? enabled
    : typeof scopeOrEnabled === "boolean"
      ? scopeOrEnabled
      : true;

  return useQuery({
    queryKey: TASK_QUERY_KEYS.statuses(scope),
    queryFn: () => taskService.statuses(workspaceId, spaceId),
    enabled: isEnabled && hasSpaceId,
  });
}

export function useTaskDetail(
  workspaceId: number,
  scope: Scope,
  taskId: number | null,
) {
  return useQuery({
    queryKey: TASK_QUERY_KEYS.detail(scope, taskId),
    queryFn: () => taskService.detail(workspaceId, taskId!),
    enabled: taskId !== null,
    staleTime: 0,
    gcTime: 0,
  });
}

export function useTaskHistory(
  workspaceId: number,
  scope: Scope,
  taskId: number,
  page: number,
) {
  return useQuery({
    queryKey: TASK_QUERY_KEYS.history(scope, taskId, page),
    queryFn: () => taskService.activities(workspaceId, taskId, page),
  });
}

export function useWorkspaceTaskActivity(
  workspaceId: number,
  scope: Scope,
  page: number,
) {
  return useQuery({
    queryKey: TASK_QUERY_KEYS.feed(scope, page),
    queryFn: () => taskService.feed(workspaceId, page),
  });
}

type MutationCallbacks = {
  onMutate?: () => void;
  onSettled?: () => void;
  onSuccess?: () => void;
};

type SaveTask =
  | { taskId: null; dto: TaskInput }
  | { taskId: number; dto: Partial<TaskInput> };

export function useSaveTask(
  workspaceId: number,
  scope: Scope,
  callbacks: MutationCallbacks = {},
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SaveTask) =>
      input.taskId === null
        ? taskService.create(workspaceId, input.dto)
        : taskService.update(workspaceId, input.taskId, input.dto),
    onMutate: callbacks.onMutate,
    onSettled: callbacks.onSettled,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: scope });
      callbacks.onSuccess?.();
    },
  });
}

export function useDeleteTask(
  workspaceId: number,
  scope: Scope,
  callbacks: MutationCallbacks = {},
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taskId: number) => taskService.remove(workspaceId, taskId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: scope });
      callbacks.onSuccess?.();
    },
  });
}
