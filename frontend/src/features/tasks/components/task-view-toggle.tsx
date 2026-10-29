"use client";

import { History, ListTodo, SquareKanban } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TaskView } from "../types";

const options = [
  { value: "board", label: "Bảng", icon: SquareKanban },
  { value: "list", label: "Danh sách", icon: ListTodo },
  { value: "activity", label: "Lịch sử", icon: History },
] as const;

interface TaskViewToggleProps {
  value: TaskView;
  onChange: (value: TaskView) => void;
  className?: string;
}

export function TaskViewToggle({
  value,
  onChange,
  className,
}: TaskViewToggleProps) {
  return (
    <div
      className={cn(
        "flex items-center rounded-lg border border-border p-0.5 bg-muted/40",
        className,
      )}
      aria-label="Chế độ xem task"
    >
      {options.map(({ value: option, label, icon: Icon }) => (
        <button
          key={option}
          type="button"
          aria-pressed={value === option}
          onClick={() => onChange(option)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
            value === option
              ? "bg-background text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Icon className="size-3.5" />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
