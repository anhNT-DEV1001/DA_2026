export type Priority = "low" | "medium" | "high" | "urgent";
export const priorityLabels: Record<Priority, string> = {
  low: "Thấp",
  medium: "Trung bình",
  high: "Cao",
  urgent: "Khẩn cấp",
};
export interface TaskInput {
  title: string;
  description: string | null;
  statusId?: number;
  assigneeId: number | null;
  priority: Priority;
  startDate: string | null;
  dueDate: string | null;
}
export interface Task extends TaskInput {
  id: number;
  workspaceId: number;
  statusId: number;
  completedAt: string | null;
  createdAt: string | null;
}
export interface TaskStatus {
  id: number;
  code: string;
  name: string;
  isCompleted: boolean;
}
export interface Page<T> {
  items: T[];
  meta: {
    page: number;
    limit: number;
    itemCount: number;
    pageCount: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
  };
}
export interface TaskFilters {
  from?: string;
  to?: string;
  page: number;
  limit: number;
  search?: string;
  statusId?: number;
  assigneeId?: number;
  priority?: Priority;
}
export interface Activity {
  taskId: number;
  id: number;
  actorId: number | null;
  action: "created" | "updated" | "deleted";
  createdAt: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
}

export type Person = { id: number; name: string };
