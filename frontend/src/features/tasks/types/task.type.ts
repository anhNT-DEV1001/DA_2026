/** Master data value thuộc nhóm PRIORITY (vd: PRIORITY002) */
export type Priority = string;
export const PRIORITY_GROUP = "PRIORITY";
export const DEFAULT_PRIORITY = "PRIORITY002";
export const HIGH_PRIORITY = "PRIORITY001";
export interface TaskInput {
  title: string;
  description: string | null;
  statusId?: number;
  priority: Priority;
  startDate: string | null;
  dueDate: string | null;
  spaceId?: number;
}
export interface Task extends TaskInput {
  id: number;
  workspaceId: number;
  statusId: number;
  assigneeIds: number[];
  completedAt: string | null;
  createdAt: string | null;
  position: number;
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
export type TaskView = "list" | "board" | "activity";
export interface TaskFilters {
  from?: string;
  to?: string;
  page: number;
  limit: number;
  search?: string;
  statusId?: number;
  assigneeId?: number;
  priority?: string;
  spaceId?: number;
  sort?: "newest" | "position";
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

export type Person = { id: number; name: string; avatar?: string | null };
