import type { Person, TaskStatus } from "./task.type";

export type TaskTimelineProps = {
  workspaceId: number;
  queryKey: readonly unknown[];
  statuses: TaskStatus[];
  people: Person[];
  names: Map<number, string>;
  canEdit: boolean;
};
