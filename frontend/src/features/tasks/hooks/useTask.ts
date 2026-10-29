"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { taskService } from "../services";
import type {
  Task,
  TaskCommentInput,
  TaskFilters,
  TaskInput,
} from "../types";

type Scope = readonly unknown[];
const _taskBase = ["tasks"] as const;
export const TASK_QUERY_KEYS = {
  all: _taskBase,
  workspace: (userId: number | undefined, workspaceId: number) =>
    [..._taskBase, userId, workspaceId] as const,
  space: (
    userId: number | undefined,
    workspaceId: number,
    spaceId: number,
  ) => [..._taskBase, userId, workspaceId, spaceId] as const,
  list: (scope: Scope, filters: TaskFilters, view: "list" | "gantt" = "list") =>
    [...scope, view, filters] as const,
  statuses: (scope: Scope) => [...scope, "statuses"] as const,
  detail: (scope: Scope, id: number | null) =>
    [...scope, "detail", id] as const,
  history: (scope: Scope, id: number, page: number) =>
    [...scope, "activities", id, page] as const,
  feed: (scope: Scope, page: number) => [...scope, "feed", page] as const,
  comments: (scope: Scope, id: number) => [...scope, "comments", id] as const,
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

/** Hoạt động task của workspace; truyền spaceId để chỉ lấy task trong space đó */
export function useWorkspaceTaskActivity(
  workspaceId: number,
  scope: Scope,
  page: number,
  spaceId?: number,
) {
  return useQuery({
    queryKey: TASK_QUERY_KEYS.feed(scope, page),
    queryFn: () => taskService.feed(workspaceId, page, spaceId),
  });
}

type MutationCallbacks = {
  onMutate?: () => void;
  onSettled?: () => void;
  onSuccess?: (task: Task) => void | Promise<void>;
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
    onSuccess: async (task) => {
      await callbacks.onSuccess?.(task);
      await queryClient.invalidateQueries({ queryKey: scope });
    },
  });
}

export function useAssignTask(workspaceId: number, scope: Scope) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, userId }: { taskId: number; userId: number }) =>
      taskService.assign(workspaceId, taskId, { userId }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: scope });
    },
  });
}

export function useUnassignTask(workspaceId: number, scope: Scope) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, userId }: { taskId: number; userId: number }) =>
      taskService.unassign(workspaceId, taskId, userId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: scope });
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

// ── Comments ──────────────────────────────────────────────────────────────────

/** Bình luận mới nhất trước, tải thêm theo trang */
export function useTaskComments(
  workspaceId: number,
  scope: Scope,
  taskId: number,
) {
  return useInfiniteQuery({
    queryKey: TASK_QUERY_KEYS.comments(scope, taskId),
    queryFn: ({ pageParam }) =>
      taskService.comments(workspaceId, taskId, pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.meta.hasNextPage ? last.meta.page + 1 : undefined,
  });
}

type CommentMutation =
  | { type: "create"; dto: TaskCommentInput }
  | { type: "update"; commentId: number; content: string }
  | { type: "delete"; commentId: number };

export function useTaskCommentMutation(
  workspaceId: number,
  scope: Scope,
  taskId: number,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CommentMutation) =>
      input.type === "create"
        ? taskService.createComment(workspaceId, taskId, input.dto)
        : input.type === "update"
          ? taskService.updateComment(
              workspaceId,
              taskId,
              input.commentId,
              input.content,
            )
          : taskService.deleteComment(workspaceId, taskId, input.commentId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: TASK_QUERY_KEYS.comments(scope, taskId),
      });
    },
  });
}
