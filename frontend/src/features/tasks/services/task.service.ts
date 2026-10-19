import { apiClient } from "@/lib/axios";

import type {
  Task,
  TaskInput,
  TaskFilters,
  TaskStatus,
  Page,
  Activity,
} from "../types";

const path = (workspaceId: number) => `/workspaces/${workspaceId}/tasks`;
export const taskService = {
  feed: (id: number, page: number) =>
    apiClient.get<unknown, Page<Activity>>(`${path(id)}/activities`, {
      params: { page, limit: 20 },
    }),
  list: (id: number, params: TaskFilters) =>
    apiClient.get<unknown, Page<Task>>(path(id), { params }),
  statuses: (id: number) =>
    apiClient.get<unknown, TaskStatus[]>(`${path(id)}/statuses`),
  detail: (id: number, taskId: number) =>
    apiClient.get<unknown, Task>(`${path(id)}/${taskId}`),
  create: (id: number, dto: TaskInput) =>
    apiClient.post<unknown, Task>(path(id), dto),
  update: (id: number, taskId: number, dto: Partial<TaskInput>) =>
    apiClient.patch<unknown, Task>(`${path(id)}/${taskId}`, dto),
  remove: (id: number, taskId: number) =>
    apiClient.delete<unknown, { id: number }>(`${path(id)}/${taskId}`),
  activities: (id: number, taskId: number, page: number) =>
    apiClient.get<unknown, Page<Activity>>(`${path(id)}/${taskId}/activities`, {
      params: { page, limit: 10 },
    }),
};
