"use client";

import { useState } from "react";
import { Check, Loader2, Search, UserPlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { useAssignTask, useUnassignTask } from "../hooks";
import type { Person } from "../types";

const MAX_VISIBLE = 3;

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function PersonAvatar({
  person,
  className,
}: {
  person: Person;
  className?: string;
}) {
  return (
    <Avatar size="sm" className={className}>
      {person.avatar && <AvatarImage src={person.avatar} alt={person.name} />}
      <AvatarFallback className="bg-primary/10 text-[10px] font-semibold text-primary">
        {getInitials(person.name)}
      </AvatarFallback>
    </Avatar>
  );
}

interface TaskAssigneeCellProps {
  workspaceId: number;
  queryKey: readonly unknown[];
  taskId: number;
  assigneeIds: number[];
  people: Person[];
  names: Map<number, string>;
  canEdit: boolean;
}

export function TaskAssigneeCell({
  workspaceId,
  queryKey,
  taskId,
  assigneeIds,
  people,
  names,
  canEdit,
}: TaskAssigneeCellProps) {
  const [search, setSearch] = useState("");
  const [pendingId, setPendingId] = useState<number | null>(null);
  const assign = useAssignTask(workspaceId, queryKey);
  const unassign = useUnassignTask(workspaceId, queryKey);

  const byId = new Map(people.map((p) => [p.id, p]));
  const toPerson = (id: number): Person =>
    byId.get(id) ?? { id, name: names.get(id) ?? `Người dùng #${id}` };
  const assigned = assigneeIds.map(toPerson);
  // Giữ cả người đã được giao nhưng không còn là thành viên hoạt động
  const options = [
    ...people,
    ...assigned.filter((p) => !byId.has(p.id)),
  ].filter((p) => p.name.toLowerCase().includes(search.trim().toLowerCase()));

  async function toggle(person: Person) {
    const isAssigned = assigneeIds.includes(person.id);
    setPendingId(person.id);
    try {
      if (isAssigned) await unassign.mutateAsync({ taskId, userId: person.id });
      else await assign.mutateAsync({ taskId, userId: person.id });
    } catch (error) {
      toast.add({
        title: isAssigned ? "Không thể bỏ giao" : "Không thể giao việc",
        description:
          error instanceof Error ? error.message : "Đã có lỗi xảy ra.",
        type: "error",
      });
    } finally {
      setPendingId(null);
    }
  }

  const summary = assigned.length ? (
    <>
      <AvatarGroup>
        {assigned.slice(0, MAX_VISIBLE).map((person) => (
          <PersonAvatar key={person.id} person={person} />
        ))}
        {assigned.length > MAX_VISIBLE && (
          <AvatarGroupCount className="size-6 text-[10px]">
            +{assigned.length - MAX_VISIBLE}
          </AvatarGroupCount>
        )}
      </AvatarGroup>
      {assigned.length === 1 && (
        <span className="truncate text-sm">{assigned[0].name}</span>
      )}
    </>
  ) : (
    <>
      <span className="flex size-6 items-center justify-center rounded-full border border-dashed border-muted-foreground/50 text-muted-foreground">
        <UserPlus className="size-3" />
      </span>
      <span className="text-sm text-muted-foreground">Chưa giao</span>
    </>
  );

  const title = assigned.map((p) => p.name).join(", ") || "Chưa giao";

  if (!canEdit)
    return (
      <div className="flex items-center gap-2" title={title}>
        {summary}
      </div>
    );

  return (
    <Popover onOpenChange={(open) => !open && setSearch("")}>
      <PopoverTrigger
        title={title}
        aria-label={`Người phụ trách: ${title}. Bấm để thay đổi`}
        className="group/assignee -mx-1.5 flex max-w-full items-center gap-2 rounded-full px-1.5 py-1 text-left transition-colors hover:bg-muted data-popup-open:bg-muted"
      >
        {summary}
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-dashed border-primary/50 text-primary opacity-0 transition-opacity group-hover/assignee:opacity-100 group-data-popup-open/assignee:opacity-100">
          <UserPlus className="size-3" />
        </span>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 gap-2 p-2">
        <div className="flex items-center justify-between px-1 pt-1">
          <span className="text-xs font-semibold uppercase text-muted-foreground">
            Người phụ trách
          </span>
          <span className="text-xs text-muted-foreground">
            {assigneeIds.length} đã giao
          </span>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            placeholder="Tìm thành viên…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-sm"
          />
        </div>
        <ul className="max-h-64 space-y-0.5 overflow-y-auto">
          {options.map((person) => {
            const isAssigned = assigneeIds.includes(person.id);
            const isPending = pendingId === person.id;
            return (
              <li key={person.id}>
                <button
                  type="button"
                  disabled={pendingId !== null}
                  aria-pressed={isAssigned}
                  onClick={() => void toggle(person)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted disabled:cursor-wait",
                    isAssigned && "bg-primary/5",
                  )}
                >
                  <PersonAvatar person={person} />
                  <span className="flex-1 truncate">{person.name}</span>
                  {isPending ? (
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  ) : (
                    isAssigned && <Check className="size-4 text-primary" />
                  )}
                </button>
              </li>
            );
          })}
          {!options.length && (
            <li className="px-2 py-4 text-center text-sm text-muted-foreground">
              Không tìm thấy thành viên
            </li>
          )}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
