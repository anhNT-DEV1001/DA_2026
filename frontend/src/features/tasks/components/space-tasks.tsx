"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Eye, Plus, RefreshCw, Trash2 } from "lucide-react";
import { WorkspaceTaskActivity } from "./task-activity";
import { DataTable, type ColumnDef } from "@/components/common/data-table";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useAuthStore } from "@/stores/auth-store";
import type { WorkspaceItem } from "@/features/workspaces/types";
import type { SpaceItem } from "@/features/workspaces/types";
import {
  HIGH_PRIORITY,
  PRIORITY_GROUP,
  type Task,
  type TaskFilters,
  type TaskInput,
  type TaskView,
} from "../types";
import { useMasterDataByGroup } from "@/features/masterdata/hooks";
import { TaskDialog } from "./task-dialog";
import { TaskCommentDrawer } from "./task-comment";
import { TaskFilter } from "./task-filter";
import { TaskInlineSelect } from "./task-inline-select";
import { TaskAssigneeCell } from "./task-assignee-cell";
import { TaskBoard } from "./task-board";
import { TaskError } from "./task-controls";
import {
  TASK_BOARD_KEYS,
  TASK_QUERY_KEYS,
  useTaskList,
  useTaskStatuses,
  useDeleteTask,
  useSaveTask,
  useTaskSearchParams,
  useTaskRealtime,
} from "../hooks";

function dateLabel(value: string | null) {
  return value ? value.split("-").reverse().join("/") : "Chưa đặt";
}

interface SpaceTasksProps {
  workspace: WorkspaceItem;
  space: SpaceItem;
  view: TaskView;
}

export function SpaceTasks({ workspace, space, view }: SpaceTasksProps) {
  const user = useAuthStore((s) => s.user);
  const permissions = useAuthStore((s) => s.permissions);
  const has = (action: string) =>
    permissions.some((p) => p.code === `TASK_${action}`);

  const queryKey = TASK_QUERY_KEYS.space(user?.id, workspace.id, space.id);
  const { filters, setFilters, ensurePagination } = useTaskSearchParams(
    space.id,
  );
  const [selected, setSelected] = useState<number | "new" | null>(null);
  // Cột trên board mà task mới được tạo từ đó
  const [newStatusId, setNewStatusId] = useState<number>();
  const [deleting, setDeleting] = useState<Task | null>(null);
  const [notice, setNotice] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const draggingRef = useRef(false);

  useTaskRealtime({
    workspaceId: workspace.id,
    spaceId: space.id,
    scope: queryKey,
    openTaskId: typeof selected === "number" ? selected : null,
    onOpenTaskDeleted: () => {
      setSelected(null);
      toast.add({
        title: "Task đã bị xóa",
        description: "Task bạn đang xem vừa bị người khác xóa.",
        type: "info",
      });
    },
    draggingRef,
    enabled: has("VIEW"),
  });

  const list = useTaskList(
    workspace.id,
    queryKey,
    filters,
    has("VIEW") && view === "list",
  );
  const queryClient = useQueryClient();
  const boardFilters = {
    search: filters.search,
    assigneeId: filters.assigneeId,
    priority: filters.priority,
    spaceId: filters.spaceId,
  };
  const statuses = useTaskStatuses(
    workspace.id,
    space.id,
    queryKey,
    has("VIEW"),
  );
  const priorities = useMasterDataByGroup(PRIORITY_GROUP);
  const remove = useDeleteTask(workspace.id, queryKey, {
    onSuccess: () => {
      if (list.data?.items.length === 1 && filters.page > 1)
        setFilters({ page: filters.page - 1 });
      setDeleting(null);
      setNotice("Đã xóa task. Lịch sử vẫn được giữ lại.");
    },
  });

  const quickUpdate = useSaveTask(workspace.id, queryKey);
  function updateField(task: Task, dto: Partial<TaskInput>) {
    quickUpdate.mutate(
      { taskId: task.id, dto },
      {
        onError: (error) =>
          toast.add({
            title: "Không thể cập nhật task",
            description:
              error instanceof Error ? error.message : "Đã có lỗi xảy ra.",
            type: "error",
          }),
      },
    );
  }
  const isUpdating = (task: Task, key: keyof TaskInput) =>
    quickUpdate.isPending &&
    quickUpdate.variables?.taskId === task.id &&
    key in quickUpdate.variables.dto;

  // Luôn có page/limit trên URL ở tab danh sách
  useEffect(() => {
    if (view === "list") ensurePagination();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  // Trang trên URL vượt quá số trang thực tế → về trang cuối
  const pageCount = list.data?.meta.pageCount ?? 0;
  useEffect(() => {
    if (pageCount > 0 && filters.page > pageCount)
      setFilters({ page: pageCount });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageCount, filters.page]);

  const names = new Map<number, string>();
  const avatars = new Map<number, string | null>();
  for (const member of workspace.members ?? [])
    avatars.set(member.userId, member.user?.avatar ?? null);
  avatars.set(workspace.ownerId, workspace.owner?.avatar ?? null);
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
  const people = [...eligible].map((id) => ({
    id,
    name: names.get(id)!,
    avatar: avatars.get(id),
  }));

  const statusOptions = (statuses.data ?? []).map((s) => ({
    value: String(s.id),
    label: s.name,
    variant: s.isCompleted ? ("default" as const) : ("secondary" as const),
  }));
  const priorityOptions = (priorities.data ?? []).map((p) => ({
    value: p.value ?? "",
    label: p.name ?? p.value ?? "",
    variant:
      p.value === HIGH_PRIORITY
        ? ("destructive" as const)
        : ("outline" as const),
  }));

  async function handleRefresh() {
    setIsRefreshing(true);
    await Promise.all([
      view === "board"
        ? queryClient.refetchQueries({
            queryKey: TASK_BOARD_KEYS.all(queryKey),
          })
        : list.refetch(),
      statuses.refetch(),
    ]);
    setTimeout(() => setIsRefreshing(false), 500);
  }

  function filter(next: Partial<TaskFilters>) {
    setFilters(next);
  }

  function openCreate(statusId?: number) {
    setNewStatusId(statusId);
    setSelected("new");
  }

  const columns: ColumnDef<Task>[] = [
    {
      id: "stt",
      header: "#",
      width: "60px",
      align: "center",
      cell: ({ index }) => (
        <span className="text-xs text-muted-foreground font-medium">
          {(filters.page - 1) * filters.limit + index + 1}
        </span>
      ),
    },
    {
      id: "title",
      header: "Task",
      minWidth: 220,
      cell: ({ row }) => <span className="font-medium">{row.title}</span>,
    },
    {
      id: "status",
      header: "Trạng thái",
      minWidth: 140,
      cell: ({ row }) => (
        <TaskInlineSelect
          label="trạng thái"
          value={String(row.statusId)}
          options={statusOptions}
          disabled={!has("UPDATE")}
          pending={isUpdating(row, "statusId")}
          onChange={(value) => updateField(row, { statusId: Number(value) })}
        />
      ),
    },
    {
      id: "assignee",
      header: "Người phụ trách",
      minWidth: 180,
      cell: ({ row }) => (
        <TaskAssigneeCell
          workspaceId={workspace.id}
          queryKey={queryKey}
          taskId={row.id}
          assigneeIds={row.assigneeIds ?? []}
          people={people}
          names={names}
          canEdit={has("UPDATE")}
        />
      ),
    },
    {
      id: "priority",
      header: "Ưu tiên",
      minWidth: 120,
      cell: ({ row }) => (
        <TaskInlineSelect
          label="mức ưu tiên"
          value={row.priority}
          options={priorityOptions}
          disabled={!has("UPDATE")}
          pending={isUpdating(row, "priority")}
          onChange={(value) => updateField(row, { priority: value })}
        />
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
    {
      id: "actions",
      header: "Thao tác",
      align: "center",
      cell: ({ row }) => (
        <div className="flex items-center justify-center gap-1">
          <Button
            size="icon-sm"
            variant="ghost"
            className="text-muted-foreground hover:bg-primary/10 hover:text-primary"
            onClick={() => setSelected(row.id)}
            aria-label={`Xem chi tiết ${row.title}`}
            title="Xem chi tiết"
          >
            <Eye className="size-4" />
          </Button>
          {has("DELETE") && (
            <Button
              size="icon-sm"
              variant="ghost"
              className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              onClick={() => {
                remove.reset();
                setDeleting(row);
              }}
              aria-label={`Xóa ${row.title}`}
              title="Xóa task"
            >
              <Trash2 className="size-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  if (!has("VIEW"))
    return (
      <p className="rounded-lg border p-6 text-sm text-muted-foreground">
        Bạn chưa có quyền xem task trong workspace này.
      </p>
    );

  return (
    <div className="space-y-5">
      {view === "activity" ? (
        <WorkspaceTaskActivity
          workspaceId={workspace.id}
          spaceId={space.id}
          onOpenTask={setSelected}
          queryKey={queryKey}
          statuses={statuses.data ?? []}
          people={people}
          names={names}
          canEdit={has("UPDATE")}
        />
      ) : (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <TaskFilter
              filters={filters}
              statuses={statuses.data ?? []}
              names={names}
              hideStatus={view === "board"}
              onChange={filter}
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={isRefreshing}
                onClick={handleRefresh}
                className="gap-1.5"
              >
                <RefreshCw
                  className={`size-4 ${isRefreshing ? "animate-spin" : ""}`}
                />
                Làm mới
              </Button>
              {has("CREATE") && (
                <Button
                  disabled={
                    !statuses.data?.length ||
                    statuses.isError ||
                    (view === "list" && list.isError)
                  }
                  onClick={() => openCreate()}
                >
                  <Plus className="size-4" />
                  Tạo task
                </Button>
              )}
            </div>
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
          {view === "board" ? (
            statuses.isPending ? (
              <p role="status" className="text-sm text-muted-foreground">
                Đang tải bảng…
              </p>
            ) : (
              statuses.data && (
                <TaskBoard
                  workspaceId={workspace.id}
                  queryKey={queryKey}
                  statuses={statuses.data}
                  filters={boardFilters}
                  people={people}
                  priorities={priorityOptions}
                  canEdit={has("UPDATE")}
                  canCreate={has("CREATE")}
                  onOpen={setSelected}
                  onCreate={openCreate}
                  draggingRef={draggingRef}
                />
              )
            )
          ) : list.isError ? (
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
                onPageChange: (page) => setFilters({ page }),
                onPageSizeChange: (limit) => filter({ limit }),
                disabled: list.isFetching,
              }}
            />
          )}
          {selected === "new" && (
            <TaskDialog
              workspaceId={workspace.id}
              spaceId={space.id}
              taskId={null}
              defaultStatusId={newStatusId}
              statuses={statuses.data ?? []}
              people={people}
              names={names}
              canEdit={has("CREATE")}
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
                  &ldquo;{deleting?.title}&rdquo; sẽ được ẩn khỏi danh sách.
                  Lịch sử thay đổi vẫn được lưu.
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
      {/* Mở được từ list, board và timeline hoạt động */}
      {selected !== null && selected !== "new" && (
        <TaskCommentDrawer
          key={selected}
          workspaceId={workspace.id}
          taskId={selected}
          statuses={statuses.data ?? []}
          people={people}
          names={names}
          canEdit={has("UPDATE")}
          queryKey={queryKey}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
