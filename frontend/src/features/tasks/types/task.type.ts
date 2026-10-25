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
  spaceId: number;
  code: string;
  name: string;
  displayOrder: number;
  isCompleted: boolean;
}
export interface CreateTaskStatusInput {
  spaceId: number;
  code: string;
  name: string;
  displayOrder?: number;
  isCompleted?: boolean;
}
export interface UpdateTaskStatusInput {
  name?: string;
  displayOrder?: number;
  isCompleted?: boolean;
}
export interface TaskAssigned {
  id: number;
  taskId: number;
  userId: number;
  assignedBy: number | null;
  user: { id: number; name: string; email: string };
}
export interface AssignTaskInput {
  userId: number;
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
/** Snapshot stored in activity log — fields are denormalized for history display. */
export interface TaskSnapshot {
  title: string;
  description: string | null;
  statusId: number;
  statusName: string | null;
  priority: string;
  startDate: string | null;
  dueDate: string | null;
  completedAt: string | null;
  assigneeIds: number[];
  [key: string]: unknown;
}
export interface Activity {
  taskId: number;
  id: number;
  actorId: number | null;
  action: "created" | "updated" | "deleted";
  createdAt: string;
  before: TaskSnapshot | null;
  after: TaskSnapshot | null;
}

export type Person = { id: number; name: string };
