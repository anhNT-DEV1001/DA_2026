import { apiClient } from "@/lib/axios";

import type {
  Activity,
  AssignTaskInput,
  CreateTaskStatusInput,
  Page,
  Task,
  TaskAssigned,
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

export const taskService = {
  // ── Task feed & list ────────────────────────────────────────────────────────
  feed: (workspaceId: number, page: number) =>
    apiClient.get<unknown, Page<Activity>>(`${path(workspaceId)}/activities`, {
      params: { page, limit: 20 },
    }),

  list: (workspaceId: number, params: TaskFilters) =>
    apiClient.get<unknown, Page<Task>>(path(workspaceId), { params }),

  detail: (workspaceId: number, taskId: number) =>
    apiClient.get<unknown, Task>(`${path(workspaceId)}/${taskId}`),

  create: (workspaceId: number, dto: TaskInput) =>
    apiClient.post<unknown, Task>(path(workspaceId), dto),

  update: (workspaceId: number, taskId: number, dto: Partial<TaskInput>) =>
    apiClient.patch<unknown, Task>(`${path(workspaceId)}/${taskId}`, dto),

  remove: (workspaceId: number, taskId: number) =>
    apiClient.delete<unknown, { id: number }>(`${path(workspaceId)}/${taskId}`),

  // ── Activity history ────────────────────────────────────────────────────────
  activities: (workspaceId: number, taskId: number, page: number) =>
    apiClient.get<unknown, Page<Activity>>(
      `${path(workspaceId)}/${taskId}/activities`,
      { params: { page, limit: 10 } },
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
};
