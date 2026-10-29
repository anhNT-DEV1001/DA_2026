"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ModalRoot,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalBody,
  ModalFooter,
} from "@/components/common/modal";
import { ComboboxPicker } from "@/components/common/combobox-picker";
import { DateTimePicker } from "@/components/common/datetime-picker";
import { RichTextEditor } from "@/components/common/rich-text-editor";
import {
  DEFAULT_PRIORITY,
  PRIORITY_GROUP,
  type Task,
  type TaskInput,
  type TaskStatus,
} from "../types";
import type { Person } from "../types";
import {
  useTaskDetail,
  useSaveTask,
  useAssignTask,
  useUnassignTask,
} from "../hooks";
import { TaskError } from "./task-controls";
import { TaskHistory } from "./task-history";
import { MasterDataPicker } from "@/features/masterdata/components/masterdata-picker";

export function toISODate(date: Date | null): string | null {
  if (!date) return null;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function toLocalDate(iso: string | null): Date | undefined {
  if (!iso) return undefined;
  const [y, mo, d] = iso.split("-").map(Number);
  return new Date(y, mo - 1, d);
}

type Props = {
  workspaceId: number;
  spaceId?: number;
  taskId: number | null;
  /** Trạng thái mặc định khi tạo task mới (vd: tạo từ một cột trên board) */
  defaultStatusId?: number;
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
    <ModalRoot
      open
      onOpenChange={(open) => {
        if (!open && !saving) props.onClose();
      }}
    >
      <ModalContent size="2xl">
        <ModalHeader>
          <ModalTitle>
            {props.taskId === null ? "Tạo task" : "Chi tiết task"}
          </ModalTitle>
          <ModalDescription>
            Nội dung, người phụ trách và kế hoạch thực hiện.
          </ModalDescription>
        </ModalHeader>

        <ModalBody>
          {props.taskId !== null && detail.isPending ? (
            <p role="status">Đang tải task…</p>
          ) : detail.isError ? (
            <TaskError
              error={detail.error}
              retry={() => void detail.refetch()}
            />
          ) : (
            <TaskForm {...props} task={detail.data} onSavingChange={setSaving} />
          )}
          {props.taskId !== null && (
            <section className="mt-4 space-y-3 border-t pt-4">
              <h3 className="font-semibold">Lịch sử task</h3>
              <TaskHistory {...props} taskId={props.taskId} />
            </section>
          )}
        </ModalBody>
      </ModalContent>
    </ModalRoot>
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
      task?.statusId ??
      props.defaultStatusId ??
      props.statuses.find((s) => s.code === "todo")?.id,
    priority: task?.priority ?? DEFAULT_PRIORITY,
    startDate: task?.startDate ?? null,
    dueDate: task?.dueDate ?? null,
    spaceId: props.spaceId,
  }));
  const [form, setForm] = useState(initial);
  // Assignee IDs managed separately from the task DTO
  const [assigneeIds, setAssigneeIds] = useState<number[]>(
    task?.assigneeIds ?? [],
  );
  const [validation, setValidation] = useState("");

  const assign = useAssignTask(props.workspaceId, props.queryKey);
  const unassign = useUnassignTask(props.workspaceId, props.queryKey);

  const mutation = useSaveTask(props.workspaceId, props.queryKey, {
    onMutate: () => onSavingChange(true),
    onSettled: () => onSavingChange(false),
    onSuccess: async (saved) => {
      // Apply assignee diff after task save
      const prev = task?.assigneeIds ?? [];
      const toAdd = assigneeIds.filter((id) => !prev.includes(id));
      const toRemove = prev.filter((id) => !assigneeIds.includes(id));
      await Promise.all([
        ...toAdd.map((userId) => assign.mutateAsync({ taskId: saved.id, userId })),
        ...toRemove.map((userId) =>
          unassign.mutateAsync({ taskId: saved.id, userId }),
        ),
      ]);
      props.onClose();
    },
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

  const statusItems = props.statuses.map((s) => ({ id: s.id, name: s.name }));

  // Include any former assignees still selected (e.g. inactive members)
  const assigneeItemsMap = new Map(
    props.people.map((p) => [p.id, p.name]),
  );
  for (const id of assigneeIds) {
    if (!assigneeItemsMap.has(id)) {
      assigneeItemsMap.set(
        id,
        props.names.get(id) ?? `Người dùng #${id}`,
      );
    }
  }
  const assigneeItems = [...assigneeItemsMap.entries()].map(([id, name]) => ({
    id,
    name,
  }));

  return (
    <form id="task-form" onSubmit={submit} className="space-y-4">
      <div className="space-y-4">
        <label className="block space-y-1 text-sm">
          Tiêu đề <span aria-hidden>*</span>
          <Input
            disabled={disabled}
            value={form.title}
            required
            maxLength={255}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </label>

        <div className="space-y-1 text-sm">
          <span>Mô tả</span>
          <RichTextEditor
            aria-label="Mô tả"
            disabled={disabled}
            value={form.description ?? ""}
            placeholder="Thêm mô tả cho task…"
            onChange={(html) => setForm({ ...form, description: html || null })}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1 text-sm">
            <span>Trạng thái</span>
            <ComboboxPicker
              items={statusItems}
              value={form.statusId ? String(form.statusId) : ""}
              onValueChange={(val) =>
                setForm({ ...form, statusId: val ? Number(val) : undefined })
              }
              placeholder="Chọn trạng thái"
              disabled={disabled}
              triggerClassName="h-9 w-full text-sm"
            />
          </div>

          <div className="space-y-1 text-sm">
            <span>Ưu tiên</span>
            <MasterDataPicker
              group={PRIORITY_GROUP}
              value={form.priority}
              onValueChange={(val) => setForm({ ...form, priority: val })}
              placeholder="Chọn mức ưu tiên"
              disabled={disabled}
              triggerClassName="h-9 w-full text-sm"
            />
          </div>

          <div className="space-y-1 text-sm sm:col-span-2">
            <span>Người phụ trách</span>
            <ComboboxPicker
              multiSelect
              items={assigneeItems}
              selectedValues={assigneeIds.map(String)}
              onSelectedValuesChange={(vals) =>
                setAssigneeIds(vals.map(Number))
              }
              placeholder="Chọn người phụ trách"
              disabled={disabled}
              triggerClassName="h-9 w-full text-sm"
            />
          </div>

          <div className="space-y-1 text-sm">
            <span>Ngày bắt đầu</span>
            <DateTimePicker
              mode="date"
              value={form.startDate}
              maxDate={toLocalDate(form.dueDate)}
              disabled={disabled}
              onChange={(date) =>
                setForm({ ...form, startDate: toISODate(date) })
              }
            />
          </div>

          <div className="space-y-1 text-sm">
            <span>Hạn hoàn thành</span>
            <DateTimePicker
              mode="date"
              value={form.dueDate}
              minDate={toLocalDate(form.startDate)}
              disabled={disabled}
              onChange={(date) =>
                setForm({ ...form, dueDate: toISODate(date) })
              }
            />
          </div>
        </div>
      </div>

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
      {(assign.isError || unassign.isError) && (
        <TaskError error={assign.error ?? unassign.error} />
      )}

      <ModalFooter bordered>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={mutation.isPending}
          onClick={props.onClose}
        >
          Đóng
        </Button>
        {props.canEdit && (
          <Button
            type="submit"
            size="sm"
            disabled={mutation.isPending || !props.statuses.length}
          >
            {mutation.isPending ? "Đang lưu…" : "Lưu task"}
          </Button>
        )}
      </ModalFooter>
    </form>
  );
}
