"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CheckCircle2, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useBoardColumn, type BoardFilters } from "../hooks";
import type { Person, Task, TaskStatus } from "../types";
import { TaskBoardCard } from "./task-board-card";
import { TaskError } from "./task-controls";
import type { InlineOption } from "./task-inline-select";

export type BoardDragData = { task: Task };

export const taskDragId = (taskId: number) => `task-${taskId}`;
export const columnDropId = (statusId: number) => `status-${statusId}`;

interface DraggableCardProps {
  task: Task;
  people: Map<number, Person>;
  priorities: Map<string, InlineOption>;
  isCompleted: boolean;
  canDrag: boolean;
  onOpen: (taskId: number) => void;
}

function SortableCard({ task, canDrag, onOpen, ...props }: DraggableCardProps) {
  const {
    setNodeRef,
    attributes,
    listeners,
    isDragging,
    transform,
    transition,
  } = useSortable({
    id: taskDragId(task.id),
    data: { task } satisfies BoardDragData,
    disabled: !canDrag,
  });

  return (
    <TaskBoardCard
      ref={setNodeRef}
      task={task}
      isDragging={isDragging}
      {...props}
      {...attributes}
      {...listeners}
      role="button"
      aria-label={`Mở task ${task.title}`}
      className={canDrag ? "cursor-grab touch-manipulation" : "cursor-pointer"}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      onClick={() => onOpen(task.id)}
      onKeyDown={(event) => {
        // Enter mở chi tiết; Space để dnd-kit bắt đầu kéo bằng bàn phím
        if (event.key === "Enter") onOpen(task.id);
        else listeners?.onKeyDown?.(event);
      }}
    />
  );
}

interface TaskBoardColumnProps {
  workspaceId: number;
  queryKey: readonly unknown[];
  status: TaskStatus;
  filters: BoardFilters;
  people: Map<number, Person>;
  priorities: Map<string, InlineOption>;
  canDrag: boolean;
  canCreate: boolean;
  onOpen: (taskId: number) => void;
  onCreate: (statusId: number) => void;
}

export function TaskBoardColumn({
  workspaceId,
  queryKey,
  status,
  filters,
  people,
  priorities,
  canDrag,
  canCreate,
  onOpen,
  onCreate,
}: TaskBoardColumnProps) {
  const column = useBoardColumn(workspaceId, queryKey, status.id, filters);
  const { setNodeRef, isOver } = useDroppable({ id: columnDropId(status.id) });

  const tasks = column.data?.pages.flatMap((page) => page.items) ?? [];
  const total = column.data?.pages[0]?.meta.itemCount ?? 0;

  return (
    <section
      aria-label={`Cột ${status.name}`}
      className={cn(
        "flex max-h-[calc(100vh-16rem)] min-h-64 w-72 shrink-0 flex-col rounded-xl border bg-muted/40 transition-colors",
        isOver && "border-primary/60 bg-primary/5",
      )}
    >
      <header
        className={cn(
          "flex items-center justify-between gap-2 border-b px-3 py-2.5",
          status.isCompleted && "text-primary",
        )}
      >
        <div className="flex min-w-0 items-center gap-1.5">
          {status.isCompleted && <CheckCircle2 className="size-4 shrink-0" />}
          <h3 className="truncate text-sm font-semibold">{status.name}</h3>
          <span className="rounded-full bg-background px-1.5 text-xs text-muted-foreground tabular-nums">
            {column.isPending ? "…" : total}
          </span>
        </div>
        {canCreate && (
          <Button
            size="icon-sm"
            variant="ghost"
            className="text-muted-foreground"
            onClick={() => onCreate(status.id)}
            aria-label={`Tạo task trong ${status.name}`}
            title="Tạo task"
          >
            <Plus className="size-4" />
          </Button>
        )}
      </header>

      <div
        ref={setNodeRef}
        className="flex flex-1 flex-col gap-2 overflow-y-auto p-2"
      >
        {column.isPending ? (
          <>
            <Skeleton className="h-20 w-full rounded-lg" />
            <Skeleton className="h-20 w-full rounded-lg" />
          </>
        ) : column.isError ? (
          <TaskError error={column.error} retry={() => void column.refetch()} />
        ) : (
          <>
            <SortableContext
              id={columnDropId(status.id)}
              items={tasks.map((task) => taskDragId(task.id))}
              strategy={verticalListSortingStrategy}
            >
              {tasks.map((task) => (
                <SortableCard
                  key={task.id}
                  task={task}
                  people={people}
                  priorities={priorities}
                  isCompleted={status.isCompleted}
                  canDrag={canDrag}
                  onOpen={onOpen}
                />
              ))}
            </SortableContext>
            {tasks.length === 0 && (
              <p className="rounded-lg border border-dashed py-6 text-center text-xs text-muted-foreground">
                {canDrag ? "Kéo task vào đây" : "Chưa có task"}
              </p>
            )}
            {column.hasNextPage && (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                disabled={column.isFetchingNextPage}
                onClick={() => void column.fetchNextPage()}
              >
                {column.isFetchingNextPage && (
                  <Loader2 className="size-3.5 animate-spin" />
                )}
                Tải thêm ({total - tasks.length})
              </Button>
            )}
          </>
        )}
      </div>
    </section>
  );
}
