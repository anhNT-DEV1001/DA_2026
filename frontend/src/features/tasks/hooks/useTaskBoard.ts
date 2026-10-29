"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
  type QueryKey,
} from "@tanstack/react-query";
import { taskService } from "../services";
import type { Page, Task, TaskFilters } from "../types";

type Scope = readonly unknown[];
type BoardPages = InfiniteData<Page<Task>, number>;
export type BoardSnapshot = [QueryKey, BoardPages | undefined][];

export const BOARD_PAGE_SIZE = 20;

/** Bộ lọc áp dụng cho board: bỏ phân trang và trạng thái (mỗi cột là một trạng thái) */
export type BoardFilters = Pick<
  TaskFilters,
  "search" | "assigneeId" | "priority" | "spaceId"
>;

export const TASK_BOARD_KEYS = {
  all: (scope: Scope) => [...scope, "board"] as const,
  column: (scope: Scope, statusId: number, filters: BoardFilters) =>
    [...scope, "board", statusId, filters] as const,
};

/** Task của một cột trên board theo thứ tự kanban, tải thêm theo trang */
export function useBoardColumn(
  workspaceId: number,
  scope: Scope,
  statusId: number,
  filters: BoardFilters,
  enabled = true,
) {
  return useInfiniteQuery({
    queryKey: TASK_BOARD_KEYS.column(scope, statusId, filters),
    queryFn: ({ pageParam }) =>
      taskService.list(workspaceId, {
        ...filters,
        statusId,
        sort: "position",
        page: pageParam,
        limit: BOARD_PAGE_SIZE,
      }),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.meta.hasNextPage ? last.meta.page + 1 : undefined,
    enabled,
  });
}

/** Ghi lại danh sách task của cột vào các trang, giữ nguyên số lượng mỗi trang */
function setItems(data: BoardPages, tasks: Task[], countDelta: number) {
  let offset = 0;
  const pages = data.pages.map((page, index) => {
    const isLast = index === data.pages.length - 1;
    const size = isLast ? tasks.length - offset : page.items.length;
    const items = tasks.slice(offset, offset + size);
    offset += size;
    return {
      ...page,
      items,
      meta: { ...page.meta, itemCount: page.meta.itemCount + countDelta },
    };
  });
  return { ...data, pages };
}

/**
 * Đọc/ghi trực tiếp cache các cột của board (với bộ lọc hiện tại)
 * để card di chuyển ngay trong lúc kéo thả.
 */
export function useBoardCache(scope: Scope, filters: BoardFilters) {
  const queryClient = useQueryClient();
  const key = (statusId: number) =>
    TASK_BOARD_KEYS.column(scope, statusId, filters);

  function getColumn(statusId: number) {
    return (
      queryClient
        .getQueryData<BoardPages>(key(statusId))
        ?.pages.flatMap((page) => page.items) ?? []
    );
  }

  /** Tìm cột và vị trí hiện tại của task */
  function locate(taskId: number, statusIds: number[]) {
    for (const statusId of statusIds) {
      const tasks = getColumn(statusId);
      const index = tasks.findIndex((t) => t.id === taskId);
      if (index !== -1) return { statusId, index, tasks };
    }
    return null;
  }

  /** Chuyển task sang cột `toStatusId` tại vị trí `toIndex` */
  function move(
    taskId: number,
    fromStatusId: number,
    toStatusId: number,
    toIndex: number,
  ) {
    const source = getColumn(fromStatusId);
    const task = source.find((t) => t.id === taskId);
    if (!task) return;
    const rest = source.filter((t) => t.id !== taskId);
    const sameColumn = fromStatusId === toStatusId;
    const target = sameColumn ? rest : getColumn(toStatusId);
    const next = [...target];
    next.splice(
      Math.max(0, Math.min(toIndex, next.length)),
      0,
      { ...task, statusId: toStatusId },
    );

    if (!sameColumn)
      queryClient.setQueryData<BoardPages>(
        key(fromStatusId),
        (data) => data && setItems(data, rest, -1),
      );
    queryClient.setQueryData<BoardPages>(
      key(toStatusId),
      (data) => data && setItems(data, next, sameColumn ? 0 : 1),
    );
  }

  async function cancel() {
    await queryClient.cancelQueries({ queryKey: TASK_BOARD_KEYS.all(scope) });
  }

  function snapshot(): BoardSnapshot {
    return queryClient.getQueriesData<BoardPages>({
      queryKey: TASK_BOARD_KEYS.all(scope),
    });
  }

  function restore(snap: BoardSnapshot) {
    for (const [queryKey, data] of snap)
      queryClient.setQueryData(queryKey, data);
  }

  return { getColumn, locate, move, cancel, snapshot, restore };
}

type MoveTask = {
  taskId: number;
  statusId: number;
  afterId: number | null;
  /** Cache trước khi kéo, để rollback nếu API lỗi */
  snapshot: BoardSnapshot;
};

/** Lưu kết quả kéo thả (cache đã được cập nhật trong lúc kéo) */
export function useMoveTask(
  workspaceId: number,
  scope: Scope,
  callbacks: { onError?: (error: unknown) => void } = {},
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, statusId, afterId }: MoveTask) =>
      taskService.move(workspaceId, taskId, { statusId, afterId }),
    onError: (error, { snapshot }) => {
      for (const [queryKey, data] of snapshot)
        queryClient.setQueryData(queryKey, data);
      callbacks.onError?.(error);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: scope }),
  });
}
