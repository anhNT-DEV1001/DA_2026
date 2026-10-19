"use client";

import { useState, type FormEvent } from "react";
import { Plus, RefreshCw, ListTodo, ChartGantt, History } from "lucide-react";
import { TaskGantt } from "./task-gantt";
import { WorkspaceTaskActivity } from "./task-activity";
import { DataTable, type ColumnDef } from "@/components/common/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useAuthStore } from "@/stores/auth-store";
import type { WorkspaceItem } from "@/features/workspaces/types";
import {
  priorityLabels,
  type Task,
  type TaskFilters,
  type Priority,
} from "../types";
import { TaskDialog } from "./task-dialog";
import { TaskError, TaskSelect } from "./task-controls";
import {
  TASK_QUERY_KEYS,
  useTaskList,
  useTaskStatuses,
  useDeleteTask,
} from "../hooks";

function dateLabel(value: string | null) {
  return value ? value.split("-").reverse().join("/") : "Chưa đặt";
}

export function WorkspaceTasks({ workspace }: { workspace: WorkspaceItem }) {
  const user = useAuthStore((s) => s.user);
  const permissions = useAuthStore((s) => s.permissions);
  const has = (action: string) =>
    permissions.some((p) => p.code === `WORKSPACE_${action}`);
  const queryKey = TASK_QUERY_KEYS.workspace(user?.id, workspace.id);
  const [view, setView] = useState<"list" | "gantt" | "activity">("list");
  const [filters, setFilters] = useState<TaskFilters>({ page: 1, limit: 20 });
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<number | "new" | null>(null);
  const [deleting, setDeleting] = useState<Task | null>(null);
  const [notice, setNotice] = useState("");
  const list = useTaskList(
    workspace.id,
    queryKey,
    filters,
    has("VIEW") && view === "list",
  );
  const statuses = useTaskStatuses(workspace.id, queryKey, has("VIEW"));
  const remove = useDeleteTask(workspace.id, queryKey, {
    onSuccess: () => {
      if (list.data?.items.length === 1 && filters.page > 1)
        setFilters({ ...filters, page: filters.page - 1 });
      setDeleting(null);
      setNotice("Đã xóa task. Lịch sử vẫn được giữ lại.");
    },
  });
  const names = new Map<number, string>();
  for (const member of workspace.members ?? [])
    names.set(
      member.userId,
      member.user?.fullName ||
        member.user?.username ||
        `Người dùng #${member.userId}`,
    );
  names.set(
    workspace.ownerId,
    workspace.owner?.fullName ||
      workspace.owner?.username ||
      `Người dùng #${workspace.ownerId}`,
  );
  const eligible = new Set([
    workspace.ownerId,
    ...(workspace.members ?? [])
      .filter(
        (m) =>
          ["MS001", "active"].includes(m.status) && m.user && !m.user.deletedAt,
      )
      .map((m) => m.userId),
  ]);
  const people = [...eligible].map((id) => ({ id, name: names.get(id)! }));
  function filter(next: Partial<TaskFilters>) {
    setFilters({ ...filters, ...next, page: 1 });
  }
  function submitSearch(event: FormEvent) {
    event.preventDefault();
    filter({ search: search.trim() || undefined });
  }
  const columns: ColumnDef<Task>[] = [
    {
      id: "title",
      header: "Task",
      minWidth: 220,
      cell: ({ row }) => (
        <button
          className="text-left font-medium text-primary hover:underline focus-visible:underline"
          onClick={() => setSelected(row.id)}
        >
          {row.title}
        </button>
      ),
    },
    {
      id: "status",
      header: "Trạng thái",
      minWidth: 140,
      cell: ({ row }) => (
        <Badge
          variant={
            statuses.data?.find((s) => s.id === row.statusId)?.isCompleted
              ? "default"
              : "secondary"
          }
        >
          {statuses.data?.find((s) => s.id === row.statusId)?.name ??
            `#${row.statusId}`}
        </Badge>
      ),
    },
    {
      id: "assignee",
      header: "Người phụ trách",
      minWidth: 160,
      cell: ({ row }) =>
        row.assigneeId
          ? (names.get(row.assigneeId) ?? `Người dùng #${row.assigneeId}`)
          : "Chưa giao",
    },
    {
      id: "priority",
      header: "Ưu tiên",
      cell: ({ row }) => (
        <Badge variant={row.priority === "urgent" ? "destructive" : "outline"}>
          {priorityLabels[row.priority]}
        </Badge>
      ),
    },
    {
      id: "start",
      header: "Bắt đầu",
      minWidth: 110,
      cell: ({ row }) => dateLabel(row.startDate),
    },
    {
      id: "due",
      header: "Hạn hoàn thành",
      minWidth: 130,
      cell: ({ row }) => dateLabel(row.dueDate),
    },
    ...(has("DELETE")
      ? [
          {
            id: "actions",
            header: "Thao tác",
            cell: ({ row }: { row: Task }) => (
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive"
                onClick={() => {
                  remove.reset();
                  setDeleting(row);
                }}
                aria-label={`Xóa ${row.title}`}
              >
                Xóa
              </Button>
            ),
          },
        ]
      : []),
  ];
  if (!has("VIEW"))
    return (
      <p className="rounded-lg border p-6 text-sm text-muted-foreground">
        Bạn chưa có quyền xem task trong workspace này.
      </p>
    );
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2" aria-label="Chế độ xem task">
        <Button
          variant={view === "list" ? "default" : "outline"}
          aria-pressed={view === "list"}
          onClick={() => setView("list")}
        >
          <ListTodo className="size-4" />
          Danh sách
        </Button>
        <Button
          variant={view === "gantt" ? "default" : "outline"}
          aria-pressed={view === "gantt"}
          onClick={() => setView("gantt")}
        >
          <ChartGantt className="size-4" />
          Gantt
        </Button>
        <Button
          variant={view === "activity" ? "default" : "outline"}
          aria-pressed={view === "activity"}
          onClick={() => setView("activity")}
        >
          <History className="size-4" />
          Timeline hoạt động
        </Button>
      </div>
      {view === "gantt" && statuses.isError ? (
        <TaskError
          error={statuses.error}
          retry={() => void statuses.refetch()}
        />
      ) : view === "gantt" && statuses.isPending ? (
        <p role="status">Đang tải trạng thái task…</p>
      ) : view === "gantt" ? (
        <TaskGantt
          workspaceId={workspace.id}
          queryKey={queryKey}
          statuses={statuses.data ?? []}
          people={people}
          names={names}
          canEdit={has("UPDATE")}
        />
      ) : view === "activity" ? (
        <WorkspaceTaskActivity
          workspaceId={workspace.id}
          queryKey={queryKey}
          statuses={statuses.data ?? []}
          people={people}
          names={names}
          canEdit={has("UPDATE")}
        />
      ) : (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Task</h2>
              <p className="text-sm text-muted-foreground">
                Phân công, theo dõi trạng thái và kế hoạch thực hiện.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                aria-label="Tải lại task"
                disabled={list.isFetching || statuses.isFetching}
                onClick={() => {
                  void list.refetch();
                  void statuses.refetch();
                }}
              >
                <RefreshCw className="size-4" />
              </Button>
              {has("CREATE") && (
                <Button
                  disabled={
                    !statuses.data?.length || statuses.isError || list.isError
                  }
                  onClick={() => setSelected("new")}
                >
                  <Plus className="size-4" />
                  Tạo task
                </Button>
              )}
            </div>
          </div>
          <form
            onSubmit={submitSearch}
            className="flex flex-col gap-2 sm:flex-row"
          >
            <Input
              aria-label="Tìm theo tiêu đề task"
              placeholder="Tìm theo tiêu đề…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Button variant="outline" type="submit">
              Tìm kiếm
            </Button>
          </form>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="space-y-1 text-xs text-muted-foreground">
              Trạng thái
              <TaskSelect
                value={filters.statusId ?? ""}
                onChange={(e) =>
                  filter({
                    statusId: e.target.value
                      ? Number(e.target.value)
                      : undefined,
                  })
                }
              >
                <option value="">Tất cả trạng thái</option>
                {statuses.data?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </TaskSelect>
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              Người phụ trách
              <TaskSelect
                value={filters.assigneeId ?? ""}
                onChange={(e) =>
                  filter({
                    assigneeId: e.target.value
                      ? Number(e.target.value)
                      : undefined,
                  })
                }
              >
                <option value="">Tất cả người phụ trách</option>
                {[...names].map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </TaskSelect>
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              Ưu tiên
              <TaskSelect
                value={filters.priority ?? ""}
                onChange={(e) =>
                  filter({
                    priority: (e.target.value || undefined) as
                      Priority | undefined,
                  })
                }
              >
                <option value="">Tất cả mức ưu tiên</option>
                {Object.entries(priorityLabels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </TaskSelect>
            </label>
          </div>
          <p role="status" className="text-sm text-muted-foreground">
            {notice}
          </p>
          {statuses.isError && (
            <TaskError
              error={statuses.error}
              retry={() => void statuses.refetch()}
            />
          )}
          {list.isError ? (
            <TaskError error={list.error} retry={() => void list.refetch()} />
          ) : (
            <DataTable
              columns={columns}
              data={list.data?.items ?? []}
              rowKey="id"
              isLoading={list.isPending || list.isFetching}
              emptyText="Chưa có task phù hợp"
              emptyDescription="Tạo task đầu tiên hoặc thay đổi bộ lọc."
              pagination={{
                page: filters.page,
                pageSize: filters.limit,
                total: list.data?.meta.itemCount ?? 0,
                pageCount: Math.max(1, list.data?.meta.pageCount ?? 0),
                pageSizeOptions: [10, 20, 50, 100],
                onPageChange: (page) => setFilters({ ...filters, page }),
                onPageSizeChange: (limit) => filter({ limit }),
                disabled: list.isFetching,
              }}
            />
          )}
          {selected !== null && (
            <TaskDialog
              key={selected}
              workspaceId={workspace.id}
              taskId={selected === "new" ? null : selected}
              statuses={statuses.data ?? []}
              people={people}
              names={names}
              canEdit={selected === "new" ? has("CREATE") : has("UPDATE")}
              queryKey={queryKey}
              onClose={() => setSelected(null)}
            />
          )}
          <Dialog
            open={deleting !== null}
            onOpenChange={(open) => {
              if (!open && !remove.isPending) setDeleting(null);
            }}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Xóa task?</DialogTitle>
                <DialogDescription>
                  “{deleting?.title}” sẽ được ẩn khỏi danh sách. Lịch sử thay
                  đổi vẫn được lưu.
                </DialogDescription>
              </DialogHeader>
              {remove.isError && <TaskError error={remove.error} />}
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  disabled={remove.isPending}
                  onClick={() => setDeleting(null)}
                >
                  Hủy
                </Button>
                <Button
                  variant="destructive"
                  disabled={remove.isPending}
                  onClick={() => {
                    if (deleting) remove.mutate(deleting.id);
                  }}
                >
                  {remove.isPending ? "Đang xóa…" : "Xóa task"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </section>
      )}
    </div>
  );
}
