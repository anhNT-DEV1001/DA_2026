export interface NotificationActor {
  id: number;
  fullName: string;
  username: string;
  avatar: string | null;
}

export interface NotificationItem {
  id: number;
  // vd: 'workspace.member_added', 'workspace.member_requested', ...
  type: string;
  title: string;
  content: string | null;
  actorId: number | null;
  workspaceId: number | null;
  entityType: string | null;
  entityId: number | null;
  // Snapshot để render/điều hướng (workspaceName, workspaceSlug, ...)
  data: Record<string, unknown> | null;
  createdAt: string;
  actor: NotificationActor | null;
  readAt: string | null;
  seenAt: string | null;
}

export interface NotificationQueryParams {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}

export interface PaginatedNotificationResponse {
  items: NotificationItem[];
  meta: {
    page: number;
    limit: number;
    itemCount: number;
    pageCount: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
  };
}

export interface NotificationCount {
  unreadCount: number;
  unseenCount: number;
}

/** Payload các event realtime trên channel 'notification' */
export type NotificationRealtimeEvent =
  | "created" // data: Notification vừa tạo
  | "read" // data: { ids?: number[]; all?: boolean }
  | "seen" // data: { all: true }
  | "deleted"; // data: { ids?: number[]; all?: boolean }
