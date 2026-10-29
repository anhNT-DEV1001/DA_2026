"use client";

import { useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { toast } from "@/components/ui/toast";
import {
  useBoardCache,
  useMoveTask,
  type BoardFilters,
  type BoardSnapshot,
} from "../hooks";
import type { Person, Task, TaskStatus } from "../types";
import { TaskBoardCard } from "./task-board-card";
import { TaskBoardColumn, type BoardDragData } from "./task-board-column";
import type { InlineOption } from "./task-inline-select";

interface TaskBoardProps {
  workspaceId: number;
  queryKey: readonly unknown[];
  statuses: TaskStatus[];
  filters: BoardFilters;
  people: Person[];
  priorities: InlineOption[];
  canEdit: boolean;
  canCreate: boolean;
  onOpen: (taskId: number) => void;
  onCreate: (statusId: number) => void;
}

export function TaskBoard({
  workspaceId,
  queryKey,
  statuses,
  filters,
  people,
  priorities,
  canEdit,
  canCreate,
  onOpen,
  onCreate,
}: TaskBoardProps) {
  const [active, setActive] = useState<Task | null>(null);
  // Vị trí ban đầu của card đang kéo và cache để hoàn tác
  const drag = useRef<{
    statusId: number;
    index: number;
    snapshot: BoardSnapshot;
  } | null>(null);
  const cache = useBoardCache(queryKey, filters);
  const move = useMoveTask(workspaceId, queryKey, {
    onError: (error) =>
      toast.add({
        title: "Không thể chuyển trạng thái",
        description:
          error instanceof Error ? error.message : "Đã có lỗi xảy ra.",
        type: "error",
      }),
  });

  // Kéo sau 5px (chuột) / giữ 200ms (cảm ứng) để click mở task và cuộn trang vẫn hoạt động
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const peopleById = new Map(people.map((p) => [p.id, p]));
  const prioritiesByValue = new Map(priorities.map((p) => [p.value, p]));
  const sorted = [...statuses].sort((a, b) => a.displayOrder - b.displayOrder);
  const statusIds = sorted.map((s) => s.id);

  const taskIdOf = (id: UniqueIdentifier) =>
    String(id).startsWith("task-") ? Number(String(id).slice(5)) : null;

  /** Cột chứa phần tử (card hoặc vùng thả của cột) */
  function columnOf(id: UniqueIdentifier) {
    const taskId = taskIdOf(id);
    if (taskId === null) return Number(String(id).slice(7));
    return cache.locate(taskId, statusIds)?.statusId;
  }

  function handleDragStart(event: DragStartEvent) {
    const task = (event.active.data.current as BoardDragData).task;
    const from = cache.locate(task.id, statusIds);
    if (!from) return;
    void cache.cancel();
    drag.current = {
      statusId: from.statusId,
      index: from.index,
      snapshot: cache.snapshot(),
    };
    setActive(task);
  }

  // Kéo sang cột khác: chuyển card ngay để cột đích mở chỗ trống
  function handleDragOver({ active: dragged, over }: DragOverEvent) {
    const taskId = taskIdOf(dragged.id);
    if (!over || taskId === null) return;
    const from = columnOf(dragged.id);
    const to = columnOf(over.id);
    if (from === undefined || to === undefined || from === to) return;

    const target = cache.getColumn(to);
    const overTaskId = taskIdOf(over.id);
    let index = target.length;
    if (overTaskId !== null) {
      const rect = dragged.rect.current.translated;
      const below = !!rect && rect.top > over.rect.top + over.rect.height / 2;
      index = target.findIndex((t) => t.id === overTaskId) + (below ? 1 : 0);
    }
    cache.move(taskId, from, to, index);
  }

  function handleDragEnd({ active: dragged, over }: DragEndEvent) {
    setActive(null);
    const start = drag.current;
    drag.current = null;
    const taskId = taskIdOf(dragged.id);
    if (!start || taskId === null) return;
    if (!over) return cache.restore(start.snapshot);

    // Sắp xếp trong cùng cột
    const overTaskId = taskIdOf(over.id);
    const current = cache.locate(taskId, statusIds);
    if (current && overTaskId !== null && overTaskId !== taskId) {
      const overIndex = current.tasks.findIndex((t) => t.id === overTaskId);
      if (overIndex !== -1)
        cache.move(taskId, current.statusId, current.statusId, overIndex);
    }

    const final = cache.locate(taskId, statusIds);
    if (!final) return cache.restore(start.snapshot);
    if (final.statusId === start.statusId && final.index === start.index)
      return;
    move.mutate({
      taskId,
      statusId: final.statusId,
      afterId: final.index > 0 ? final.tasks[final.index - 1].id : null,
      snapshot: start.snapshot,
    });
  }

  function handleDragCancel() {
    setActive(null);
    if (drag.current) cache.restore(drag.current.snapshot);
    drag.current = null;
  }

  if (!sorted.length)
    return (
      <p className="rounded-lg border p-6 text-sm text-muted-foreground">
        Space này chưa có trạng thái nào để hiển thị bảng.
      </p>
    );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
      accessibility={{
        screenReaderInstructions: {
          draggable:
            "Nhấn Space để nhấc task, dùng phím mũi tên để đổi vị trí hoặc sang cột khác, Space để thả, Esc để hủy. Nhấn Enter để mở chi tiết.",
        },
      }}
    >
      <div className="-mx-4 overflow-x-auto px-4 pb-2">
        <div className="flex w-max items-start gap-3">
          {sorted.map((status) => (
            <TaskBoardColumn
              key={status.id}
              workspaceId={workspaceId}
              queryKey={queryKey}
              status={status}
              filters={filters}
              people={peopleById}
              priorities={prioritiesByValue}
              canDrag={canEdit}
              canCreate={canCreate}
              onOpen={onOpen}
              onCreate={onCreate}
            />
          ))}
        </div>
      </div>
      <DragOverlay dropAnimation={null}>
        {active && (
          <TaskBoardCard
            task={active}
            people={peopleById}
            priorities={prioritiesByValue}
            isCompleted={
              statuses.find((s) => s.id === active.statusId)?.isCompleted ??
              false
            }
            isOverlay
            className="w-68"
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}
