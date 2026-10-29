import type { Person, TaskStatus } from "./task.type";

export type TaskTimelineProps = {
  workspaceId: number;
  queryKey: readonly unknown[];
  statuses: TaskStatus[];
  people: Person[];
  names: Map<number, string>;
  canEdit: boolean;
  /** Chỉ lấy hoạt động của task trong space này */
  spaceId?: number;
  /** Bấm tên task để mở drawer chi tiết */
  onOpenTask?: (taskId: number) => void;
};
