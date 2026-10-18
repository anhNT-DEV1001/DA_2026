import { apiClient } from "@/lib/axios";
import type {
  NotificationCount,
  NotificationQueryParams,
  PaginatedNotificationResponse,
} from "../types";

type OkResponse = { ok: boolean };

export const notificationService = {
  /**
   * Lấy danh sách thông báo của người dùng hiện tại
   * GET /notifications
   */
  getNotifications: async (
    params?: NotificationQueryParams,
  ): Promise<PaginatedNotificationResponse> => {
    return apiClient.get<unknown, PaginatedNotificationResponse>(
      "/notifications",
      { params },
    );
  },

  /**
   * Đếm số thông báo chưa đọc / chưa xem
   * GET /notifications/count
   */
  getCount: async (): Promise<NotificationCount> => {
    return apiClient.get<unknown, NotificationCount>("/notifications/count");
  },

  /**
   * Đánh dấu đã xem tất cả (reset badge)
   * PATCH /notifications/seen
   */
  markAllSeen: async (): Promise<OkResponse> => {
    return apiClient.patch<unknown, OkResponse>("/notifications/seen");
  },

  /**
   * Đánh dấu đã đọc tất cả
   * PATCH /notifications/read-all
   */
  markAllRead: async (): Promise<OkResponse> => {
    return apiClient.patch<unknown, OkResponse>("/notifications/read-all");
  },

  /**
   * Đánh dấu đã đọc một thông báo
   * PATCH /notifications/:id/read
   */
  markRead: async (id: number): Promise<OkResponse> => {
    return apiClient.patch<unknown, OkResponse>(`/notifications/${id}/read`);
  },

  /**
   * Ẩn tất cả thông báo
   * DELETE /notifications
   */
  removeAll: async (): Promise<OkResponse> => {
    return apiClient.delete<unknown, OkResponse>("/notifications");
  },

  /**
   * Ẩn một thông báo
   * DELETE /notifications/:id
   */
  remove: async (id: number): Promise<OkResponse> => {
    return apiClient.delete<unknown, OkResponse>(`/notifications/${id}`);
  },
};
