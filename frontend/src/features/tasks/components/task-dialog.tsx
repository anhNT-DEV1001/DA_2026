"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  priorityLabels,
  type Task,
  type TaskInput,
  type TaskStatus,
  type Priority,
} from "../types";
import type { Person } from "../types";
import { useTaskDetail, useTaskHistory, useSaveTask } from "../hooks";
import { TaskError, TaskSelect } from "./task-controls";

const fieldLabels: Record<string, string> = {
  title: "Tiêu đề",
  description: "Mô tả",
  statusId: "Trạng thái",
  assigneeId: "Người phụ trách",
  priority: "Ưu tiên",
  startDate: "Ngày bắt đầu",
  dueDate: "Hạn hoàn thành",
  completedAt: "Hoàn thành lúc",
};

type Props = {
  workspaceId: number;
  taskId: number | null;
  statuses: TaskStatus[];
  people: Person[];
  names: Map<number, string>;
  canEdit: boolean;
  queryKey: readonly unknown[];
  onClose: () => void;
};

export function TaskDialog(props: Props) {
  const [saving, setSaving] = useState(false);
  const detail = useTaskDetail(props.workspaceId, props.queryKey, props.taskId);
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !saving) props.onClose();
      }}
    >
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {props.taskId === null ? "Tạo task" : "Chi tiết task"}
          </DialogTitle>
          <DialogDescription>
            Nội dung, người phụ trách và kế hoạch thực hiện.
          </DialogDescription>
        </DialogHeader>
        {props.taskId !== null && detail.isPending ? (
          <p role="status">Đang tải task…</p>
        ) : detail.isError ? (
          <TaskError error={detail.error} retry={() => void detail.refetch()} />
        ) : (
          <TaskForm {...props} task={detail.data} onSavingChange={setSaving} />
        )}
        {props.taskId !== null && (
          <TaskHistory {...props} taskId={props.taskId} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function TaskForm({
  task,
  onSavingChange,
  ...props
}: Props & { task?: Task; onSavingChange: (saving: boolean) => void }) {
  const [initial] = useState<TaskInput>(() => ({
    title: task?.title ?? "",
    description: task?.description ?? null,
    statusId:
      task?.statusId ?? props.statuses.find((s) => s.code === "todo")?.id,
    assigneeId: task?.assigneeId ?? null,
    priority: task?.priority ?? "medium",
    startDate: task?.startDate ?? null,
    dueDate: task?.dueDate ?? null,
  }));
  const [form, setForm] = useState(initial);
  const [validation, setValidation] = useState("");
  const mutation = useSaveTask(props.workspaceId, props.queryKey, {
    onMutate: () => onSavingChange(true),
    onSettled: () => onSavingChange(false),
    onSuccess: props.onClose,
  });
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.title.trim()) {
      setValidation("Vui lòng nhập tiêu đề task.");
      return;
    }
    if (form.startDate && form.dueDate && form.startDate > form.dueDate) {
      setValidation("Ngày bắt đầu không được sau hạn hoàn thành.");
      return;
    }
    setValidation("");
    const value = { ...form, title: form.title.trim() };
    // Preserve assignments to former members when only other fields change.
    const changed = Object.fromEntries(
      Object.entries(value).filter(
        ([key, val]) => val !== initial[key as keyof TaskInput],
      ),
    );
    if (task) mutation.mutate({ taskId: task.id, dto: changed });
    else mutation.mutate({ taskId: null, dto: value });
  }
  const disabled = !props.canEdit || mutation.isPending;
  return (
    <form onSubmit={submit} className="space-y-4">
      <fieldset disabled={disabled} className="space-y-4 disabled:opacity-80">
        <label className="block space-y-1 text-sm">
          Tiêu đề <span aria-hidden>*</span>
          <Input
            value={form.title}
            required
            maxLength={255}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </label>
        <label className="block space-y-1 text-sm">
          Mô tả
          <Textarea
            rows={3}
            maxLength={20000}
            value={form.description ?? ""}
            onChange={(e) =>
              setForm({ ...form, description: e.target.value || null })
            }
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            Trạng thái
            <TaskSelect
              value={form.statusId ?? ""}
              required
              onChange={(e) =>
                setForm({ ...form, statusId: Number(e.target.value) })
              }
            >
              {props.statuses.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </TaskSelect>
          </label>
          <label className="space-y-1 text-sm">
            Ưu tiên
            <TaskSelect
              value={form.priority}
              onChange={(e) =>
                setForm({ ...form, priority: e.target.value as Priority })
              }
            >
              {Object.entries(priorityLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </TaskSelect>
          </label>
          <label className="space-y-1 text-sm sm:col-span-2">
            Người phụ trách
            <TaskSelect
              value={form.assigneeId ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  assigneeId: e.target.value ? Number(e.target.value) : null,
                })
              }
            >
              <option value="">Chưa giao</option>
              {form.assigneeId &&
                !props.people.some((p) => p.id === form.assigneeId) && (
                  <option value={form.assigneeId} disabled>
                    {props.names.get(form.assigneeId) ??
                      `Người dùng #${form.assigneeId}`}{" "}
                    (không còn hoạt động)
                  </option>
                )}
              {props.people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </TaskSelect>
          </label>
          <label className="space-y-1 text-sm">
            Ngày bắt đầu
            <Input
              type="date"
              value={form.startDate ?? ""}
              max={form.dueDate ?? undefined}
              onChange={(e) =>
                setForm({ ...form, startDate: e.target.value || null })
              }
            />
          </label>
          <label className="space-y-1 text-sm">
            Hạn hoàn thành
            <Input
              type="date"
              value={form.dueDate ?? ""}
              min={form.startDate ?? undefined}
              onChange={(e) =>
                setForm({ ...form, dueDate: e.target.value || null })
              }
            />
          </label>
        </div>
      </fieldset>
      {task?.completedAt && (
        <p className="text-sm text-muted-foreground">
          Hoàn thành: {new Date(task.completedAt).toLocaleString("vi-VN")}
        </p>
      )}
      {validation && (
        <p role="alert" className="text-sm text-destructive">
          {validation}
        </p>
      )}
      {mutation.isError && <TaskError error={mutation.error} />}
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={mutation.isPending}
          onClick={props.onClose}
        >
          Đóng
        </Button>
        {props.canEdit && (
          <Button
            type="submit"
            disabled={mutation.isPending || !props.statuses.length}
          >
            {mutation.isPending ? "Đang lưu…" : "Lưu task"}
          </Button>
        )}
      </div>
    </form>
  );
}

function TaskHistory(props: Props & { taskId: number }) {
  const [page, setPage] = useState(1);
  const history = useTaskHistory(
    props.workspaceId,
    props.queryKey,
    props.taskId,
    page,
  );
  function format(key: string, value: unknown): string {
    if (value === null || value === undefined || value === "") return "Chưa có";
    if (key === "statusId")
      return (
        props.statuses.find((s) => s.id === value)?.name ??
        `Trạng thái #${value}`
      );
    if (key === "assigneeId")
      return props.names.get(Number(value)) ?? `Người dùng #${value}`;
    if (key === "priority")
      return priorityLabels[value as Priority] ?? String(value);
    if (key === "completedAt")
      return new Date(String(value)).toLocaleString("vi-VN");
    return String(value);
  }
  return (
    <section className="space-y-3 border-t pt-4">
      <h3 className="font-semibold">Lịch sử task</h3>
      {history.isPending ? (
        <p role="status" className="text-sm">
          Đang tải lịch sử…
        </p>
      ) : history.isError ? (
        <TaskError error={history.error} retry={() => void history.refetch()} />
      ) : (
        <>
          {!history.data.items.length && (
            <p className="text-sm text-muted-foreground">
              Chưa có lịch sử được ghi nhận.
            </p>
          )}
          <ol className="space-y-3">
            {history.data.items.map((item) => (
              <li key={item.id} className="border-l-2 pl-3 text-sm">
                <p className="font-medium">
                  {item.action === "created"
                    ? "Tạo task"
                    : item.action === "deleted"
                      ? "Xóa task"
                      : "Cập nhật task"}{" "}
                  ·{" "}
                  {item.actorId
                    ? (props.names.get(item.actorId) ??
                      `Người dùng #${item.actorId}`)
                    : "Người dùng đã xóa"}
                </p>
                <time
                  dateTime={item.createdAt}
                  className="text-xs text-muted-foreground"
                >
                  {new Date(item.createdAt).toLocaleString("vi-VN")}
                </time>
                {Object.keys(item.after ?? item.before ?? {})
                  .filter(
                    (key) =>
                      key in fieldLabels &&
                      (item.action !== "updated" ||
                        item.before?.[key] !== item.after?.[key]),
                  )
                  .map((key) => (
                    <p
                      key={key}
                      className="mt-1 break-words whitespace-pre-wrap text-muted-foreground"
                    >
                      {fieldLabels[key]}:{" "}
                      {item.action === "updated"
                        ? `${format(key, item.before?.[key])} → `
                        : ""}
                      {format(key, (item.after ?? item.before)?.[key])}
                    </p>
                  ))}
              </li>
            ))}
          </ol>
          {history.data.meta.pageCount > 1 && (
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Trước
              </Button>
              <span className="text-sm">
                Trang {page}/{history.data.meta.pageCount}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={!history.data.meta.hasNextPage}
                onClick={() => setPage(page + 1)}
              >
                Sau
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
