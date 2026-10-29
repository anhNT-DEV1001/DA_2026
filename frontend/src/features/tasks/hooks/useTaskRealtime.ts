"use client";

import { useEffect, useRef, type RefObject } from "react";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import { useRealtime, useRealtimeChannel } from "@/providers/websocket-provider";
import type { TaskRealtimeEvent, TaskRealtimePayload } from "../types";
import { TASK_QUERY_KEYS } from "./useTask";
import { TASK_BOARD_KEYS } from "./useTaskBoard";

type Scope = readonly unknown[];

// Gom các event đến gần nhau thành một lần refetch
const FLUSH_DELAY_MS = 150;

type Options = {
  workspaceId: number;
  spaceId: number;
  scope: Scope;
  /** Task đang mở trong drawer chi tiết */
  openTaskId: number | null;
  /** Task đang mở bị người khác xóa */
  onOpenTaskDeleted?: () => void;
  /** true khi đang kéo thả trên board: hoãn refetch để card không nhảy dưới tay */
  draggingRef?: RefObject<boolean>;
  enabled?: boolean;
};

/**
 * Lắng nghe topic 'task-space:{workspaceId}:{spaceId}' và làm mới các query bị ảnh hưởng
 * (list, gantt, board, chi tiết, lịch sử, bình luận, trạng thái).
 * Chỉ gọi một lần cho mỗi space (trong SpaceTasks).
 */
export function useTaskRealtime({
  workspaceId,
  spaceId,
  scope,
  openTaskId,
  onOpenTaskDeleted,
  draggingRef,
  enabled = true,
}: Options) {
  const queryClient = useQueryClient();
  const { status } = useRealtime();
  const pending = useRef(new Map<string, QueryKey>());
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  function flush() {
    timer.current = undefined;
    // Đang kéo thả hoặc đang lưu (vd: move) → thử lại sau, tránh ghi đè cache optimistic
    if (draggingRef?.current || queryClient.isMutating() > 0) {
      timer.current = setTimeout(flush, FLUSH_DELAY_MS * 2);
      return;
    }
    const keys = [...pending.current.values()];
    pending.current.clear();
    for (const queryKey of keys) void queryClient.invalidateQueries({ queryKey });
  }

  function queue(...keys: QueryKey[]) {
    for (const key of keys) pending.current.set(JSON.stringify(key), key);
    timer.current ??= setTimeout(flush, FLUSH_DELAY_MS);
  }

  useEffect(() => () => clearTimeout(timer.current), []);

  const topic = enabled ? `task-space:${workspaceId}:${spaceId}` : null;

  useRealtimeChannel<TaskRealtimePayload>(
    topic,
    (env) => {
      const event = env.event as TaskRealtimeEvent;
      const { taskId, statusId, fromStatusId } = env.data;
      const isOpen = taskId !== undefined && taskId === openTaskId;

      if (event.startsWith("comment.")) {
        if (taskId !== undefined)
          queue(TASK_QUERY_KEYS.comments(scope, taskId));
        return;
      }

      if (event === "status.changed") {
        queue(TASK_QUERY_KEYS.statuses(scope), TASK_BOARD_KEYS.all(scope));
        return;
      }

      // task.*
      const columns = [statusId, fromStatusId].filter(
        (id): id is number => id !== undefined,
      );
      queue(
        [...scope, "list"],
        [...scope, "gantt"],
        [...scope, "feed"],
        // Không biết cột nào thì làm mới cả board
        ...(columns.length
          ? columns.map((id) => [...TASK_BOARD_KEYS.all(scope), id])
          : [TASK_BOARD_KEYS.all(scope)]),
      );
      if (!isOpen) return;
      if (event === "task.deleted") {
        onOpenTaskDeleted?.();
        return;
      }
      queue(
        TASK_QUERY_KEYS.detail(scope, taskId),
        [...scope, "activities", taskId],
      );
    },
    { subscribe: true },
  );

  // Kết nối lại sau khi mất kết nối → có thể đã lỡ event, tải lại toàn bộ dữ liệu của space
  const wasDisconnected = useRef(false);
  useEffect(() => {
    if (!enabled) return;
    if (status === "disconnected") wasDisconnected.current = true;
    if (status === "connected" && wasDisconnected.current) {
      wasDisconnected.current = false;
      void queryClient.invalidateQueries({ queryKey: scope });
    }
    // scope là mảng tạo mới mỗi render; chỉ phụ thuộc vào trạng thái kết nối
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, enabled]);
}
