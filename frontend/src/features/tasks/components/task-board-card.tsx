"use client";

import { forwardRef, type HTMLAttributes } from "react";
import { CalendarDays } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { Person, Task } from "../types";
import type { InlineOption } from "./task-inline-select";

const MAX_VISIBLE = 3;

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function todayISO() {
  const now = new Date();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${m}-${d}`;
}

interface TaskBoardCardProps extends HTMLAttributes<HTMLDivElement> {
  task: Task;
  people: Map<number, Person>;
  priorities: Map<string, InlineOption>;
  isCompleted: boolean;
  isDragging?: boolean;
  isOverlay?: boolean;
}

export const TaskBoardCard = forwardRef<HTMLDivElement, TaskBoardCardProps>(
  function TaskBoardCard(
    {
      task,
      people,
      priorities,
      isCompleted,
      isDragging,
      isOverlay,
      className,
      ...props
    },
    ref,
  ) {
    const priority = priorities.get(task.priority);
    const assigned = (task.assigneeIds ?? []).map(
      (id) => people.get(id) ?? { id, name: `Người dùng #${id}` },
    );
    const overdue = !isCompleted && !!task.dueDate && task.dueDate < todayISO();

    return (
      <div
        ref={ref}
        className={cn(
          "group space-y-2.5 rounded-lg border bg-card p-3 text-left text-sm shadow-xs transition-colors hover:border-primary/40",
          isDragging && "opacity-40",
          isOverlay && "rotate-2 cursor-grabbing shadow-lg",
          className,
        )}
        {...props}
      >
        <p
          className={cn(
            "line-clamp-3 font-medium break-words",
            isCompleted && "text-muted-foreground line-through",
          )}
        >
          {task.title}
        </p>
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            {priority && (
              <Badge variant={priority.variant ?? "outline"}>
                {priority.label}
              </Badge>
            )}
            {task.dueDate && (
              <span
                className={cn(
                  "flex items-center gap-1 text-xs text-muted-foreground",
                  overdue && "font-medium text-destructive",
                )}
                title={overdue ? "Đã quá hạn" : "Hạn hoàn thành"}
              >
                <CalendarDays className="size-3" />
                {task.dueDate.split("-").reverse().slice(0, 2).join("/")}
              </span>
            )}
          </div>
          {assigned.length > 0 && (
            <AvatarGroup>
              {assigned.slice(0, MAX_VISIBLE).map((person) => (
                <Avatar key={person.id} size="sm" title={person.name}>
                  {person.avatar && (
                    <AvatarImage src={person.avatar} alt={person.name} />
                  )}
                  <AvatarFallback className="bg-primary/10 text-[10px] font-semibold text-primary">
                    {getInitials(person.name)}
                  </AvatarFallback>
                </Avatar>
              ))}
              {assigned.length > MAX_VISIBLE && (
                <AvatarGroupCount className="size-6 text-[10px]">
                  +{assigned.length - MAX_VISIBLE}
                </AvatarGroupCount>
              )}
            </AvatarGroup>
          )}
        </div>
      </div>
    );
  },
);
