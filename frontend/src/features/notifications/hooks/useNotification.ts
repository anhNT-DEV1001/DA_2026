"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "@/components/ui/toast";
import { useRealtimeChannel } from "@/providers/websocket-provider";
import { useAuthStore } from "@/stores/auth-store";
import { notificationService } from "../services";
import type { NotificationItem, NotificationRealtimeEvent } from "../types";

export const NOTIFICATION_CHANNEL = "notification";
const PAGE_SIZE = 10;

export const NOTIFICATION_QUERY_KEYS = {
  all: ["notifications"] as const,
  lists: () => [...NOTIFICATION_QUERY_KEYS.all, "list"] as const,
  list: (unreadOnly: boolean) =>
    [...NOTIFICATION_QUERY_KEYS.lists(), { unreadOnly }] as const,
  count: () => [...NOTIFICATION_QUERY_KEYS.all, "count"] as const,
};

/**
 * Hook lấy danh sách thông báo dạng cuộn vô hạn (mới nhất trước)
 */
export function useNotificationList(
  options: { unreadOnly?: boolean; enabled?: boolean } = {},
) {
  const { unreadOnly = false, enabled = true } = options;
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const query = useInfiniteQuery({
    queryKey: NOTIFICATION_QUERY_KEYS.list(unreadOnly),
    queryFn: ({ pageParam }) =>
      notificationService.getNotifications({
        page: pageParam,
        limit: PAGE_SIZE,
        unreadOnly: unreadOnly || undefined,
      }),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.meta.hasNextPage ? last.meta.page + 1 : undefined,
    enabled: enabled && isAuthenticated,
  });

  const notifications: NotificationItem[] =
    query.data?.pages.flatMap((p) => p.items) ?? [];

  return { ...query, notifications };
}

/**
 * Hook lấy số thông báo chưa đọc / chưa xem (dùng cho badge chuông)
 */
export function useNotificationCount() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const query = useQuery({
    queryKey: NOTIFICATION_QUERY_KEYS.count(),
    queryFn: notificationService.getCount,
    enabled: isAuthenticated,
  });

  return {
    ...query,
    unreadCount: query.data?.unreadCount ?? 0,
    unseenCount: query.data?.unseenCount ?? 0,
  };
}

/**
 * Hook thao tác với thông báo (đánh dấu đã xem/đã đọc, ẩn, ẩn tất cả)
 */
export function useNotificationActions() {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: NOTIFICATION_QUERY_KEYS.all });

  const markAllSeenMutation = useMutation({
    mutationFn: notificationService.markAllSeen,
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: NOTIFICATION_QUERY_KEYS.count(),
      }),
  });

  const markReadMutation = useMutation({
    mutationFn: notificationService.markRead,
    onSuccess: invalidate,
  });

  const markAllReadMutation = useMutation({
    mutationFn: notificationService.markAllRead,
    onSuccess: invalidate,
  });

  const removeMutation = useMutation({
    mutationFn: notificationService.remove,
    onSuccess: invalidate,
  });

  const removeAllMutation = useMutation({
    mutationFn: notificationService.removeAll,
    onSuccess: invalidate,
  });

  return {
    markAllSeen: markAllSeenMutation.mutate,
    markRead: markReadMutation.mutate,
    markAllRead: markAllReadMutation.mutate,
    isMarkingAllRead: markAllReadMutation.isPending,
    remove: removeMutation.mutate,
    removeAll: removeAllMutation.mutate,
    isRemovingAll: removeAllMutation.isPending,
  };
}

/**
 * Lắng nghe channel 'notification' qua websocket:
 * - 'created': làm mới danh sách/badge và hiện toast.
 * - 'read' | 'seen' | 'deleted': đồng bộ trạng thái từ tab/thiết bị khác.
 * Chỉ nên gọi một lần (trong NotificationBell).
 */
export function useNotificationRealtime(options: { showToast?: boolean } = {}) {
  const { showToast = true } = options;
  const queryClient = useQueryClient();

  useRealtimeChannel<NotificationItem>(NOTIFICATION_CHANNEL, (env) => {
    queryClient.invalidateQueries({ queryKey: NOTIFICATION_QUERY_KEYS.all });

    const event = env.event as NotificationRealtimeEvent;
    if (event === "created" && showToast) {
      toast.add({
        title: env.data.title,
        description: env.data.content ?? undefined,
        type: "info",
      });
    }
  });
}
