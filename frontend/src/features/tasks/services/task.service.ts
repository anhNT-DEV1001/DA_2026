import { apiClient } from "@/lib/axios";

import type {
  Activity,
  AssignTaskInput,
  CreateTaskStatusInput,
  Page,
  Task,
  TaskAssigned,
  TaskComment,
  TaskCommentInput,
  TaskFilters,
  TaskInput,
  TaskStatus,
  UpdateTaskStatusInput,
} from "../types";

const path = (workspaceId: number) => `/workspaces/${workspaceId}/tasks`;
const statusPath = (workspaceId: number, statusId?: number) =>
  statusId !== undefined
    ? `${path(workspaceId)}/statuses/${statusId}`
    : `${path(workspaceId)}/statuses`;
const assigneePath = (workspaceId: number, taskId: number, userId?: number) =>
  userId !== undefined
    ? `${path(workspaceId)}/${taskId}/assignees/${userId}`
    : `${path(workspaceId)}/${taskId}/assignees`;

const commentPath = (workspaceId: number, taskId: number, commentId?: number) =>
  commentId !== undefined
    ? `${path(workspaceId)}/${taskId}/comments/${commentId}`
    : `${path(workspaceId)}/${taskId}/comments`;

export const taskService = {
  // ── Task feed & list ────────────────────────────────────────────────────────
  feed: (workspaceId: number, page: number, spaceId?: number) =>
    apiClient.get<unknown, Page<Activity>>(`${path(workspaceId)}/activities`, {
      params: { page, limit: 20, spaceId },
    }),

  list: (workspaceId: number, params: TaskFilters) =>
    apiClient.get<unknown, Page<Task>>(path(workspaceId), { params }),

  detail: (workspaceId: number, taskId: number) =>
    apiClient.get<unknown, Task>(`${path(workspaceId)}/${taskId}`),

  create: (workspaceId: number, dto: TaskInput) =>
    apiClient.post<unknown, Task>(path(workspaceId), dto),

  update: (workspaceId: number, taskId: number, dto: Partial<TaskInput>) =>
    apiClient.patch<unknown, Task>(`${path(workspaceId)}/${taskId}`, dto),

  /** Kéo thả kanban: đặt task vào cột statusId, ngay sau afterId (null = đầu cột) */
  move: (
    workspaceId: number,
    taskId: number,
    dto: { statusId: number; afterId: number | null },
  ) =>
    apiClient.patch<unknown, Task>(`${path(workspaceId)}/${taskId}/move`, dto),

  remove: (workspaceId: number, taskId: number) =>
    apiClient.delete<unknown, { id: number }>(`${path(workspaceId)}/${taskId}`),

  // ── Activity history ────────────────────────────────────────────────────────
  activities: (workspaceId: number, taskId: number, page: number) =>
    apiClient.get<unknown, Page<Activity>>(
      `${path(workspaceId)}/${taskId}/activities`,
      { params: { page, limit: 30 } },
    ),

  // ── Task statuses (per space) ───────────────────────────────────────────────
  statuses: (workspaceId: number, spaceId: number) =>
    apiClient.get<unknown, TaskStatus[]>(statusPath(workspaceId), {
      params: { spaceId },
    }),

  createStatus: (workspaceId: number, dto: CreateTaskStatusInput) =>
    apiClient.post<unknown, TaskStatus>(statusPath(workspaceId), dto),

  updateStatus: (
    workspaceId: number,
    statusId: number,
    spaceId: number,
    dto: UpdateTaskStatusInput,
  ) =>
    apiClient.patch<unknown, TaskStatus>(
      statusPath(workspaceId, statusId),
      dto,
      { params: { spaceId } },
    ),

  deleteStatus: (workspaceId: number, statusId: number, spaceId: number) =>
    apiClient.delete<unknown, { id: number }>(
      statusPath(workspaceId, statusId),
      { params: { spaceId } },
    ),

  // ── Assignees ───────────────────────────────────────────────────────────────
  listAssignees: (workspaceId: number, taskId: number) =>
    apiClient.get<unknown, TaskAssigned[]>(assigneePath(workspaceId, taskId)),

  assign: (workspaceId: number, taskId: number, dto: AssignTaskInput) =>
    apiClient.post<unknown, TaskAssigned>(
      assigneePath(workspaceId, taskId),
      dto,
    ),

  unassign: (workspaceId: number, taskId: number, userId: number) =>
    apiClient.delete<unknown, { taskId: number; userId: number }>(
      assigneePath(workspaceId, taskId, userId),
    ),

  // ── Comments ────────────────────────────────────────────────────────────────
  comments: (workspaceId: number, taskId: number, page: number) =>
    apiClient.get<unknown, Page<TaskComment>>(commentPath(workspaceId, taskId), {
      params: { page, limit: 20 },
    }),

  createComment: (workspaceId: number, taskId: number, dto: TaskCommentInput) =>
    apiClient.post<unknown, TaskComment>(commentPath(workspaceId, taskId), {
      ...dto,
      contentType: "html",
    }),

  updateComment: (
    workspaceId: number,
    taskId: number,
    commentId: number,
    content: string,
  ) =>
    apiClient.patch<unknown, TaskComment>(
      commentPath(workspaceId, taskId, commentId),
      { content },
    ),

  deleteComment: (workspaceId: number, taskId: number, commentId: number) =>
    apiClient.delete<unknown, { id: number }>(
      commentPath(workspaceId, taskId, commentId),
    ),

  // ── Ảnh chèn trong bình luận / mô tả ────────────────────────────────────────
  uploadImage: (workspaceId: number, taskId: number, file: File) => {
    const data = new FormData();
    data.append("file", file);
    return apiClient.post<unknown, { url: string }>(
      `${path(workspaceId)}/${taskId}/images`,
      data,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
  },
};
