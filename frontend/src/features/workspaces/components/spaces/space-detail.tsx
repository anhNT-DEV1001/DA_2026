"use client";

import * as React from "react";
import { Modal } from "@/components/common/modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { useSpace } from "../../hooks";
import type { CreateSpaceDto, SpaceItem, UpdateSpaceDto } from "../../types";
import {
  FolderOpen,
  Pencil,
  PlusCircle,
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  GripVertical,
  Layers,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { taskService } from "@/features/tasks/services";
import type { TaskStatus } from "@/features/tasks/types";
import { TASK_QUERY_KEYS } from "@/features/tasks/hooks";
import { useAuthStore } from "@/stores/auth-store";
import { MenuIcon } from "@/features/menus";

export interface SpaceDetailProps {
  workspaceId: number;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  space?: SpaceItem | null;
  onSuccess?: (saved: SpaceItem) => void;
  trigger?: React.ReactNode;
}

interface FormState {
  name: string;
  description: string;
  icon: string;
  displayOrder: number;
}

const initial: FormState = {
  name: "",
  description: "",
  icon: "",
  displayOrder: 1,
};

interface StatusDraft {
  tempId: string;
  id?: number;
  name: string;
  code: string;
  isCompleted: boolean;
  _deleted?: boolean;
}

function toCode(name: string): string {
  return name
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/[^A-Z0-9_]/g, "")
    .slice(0, 32);
}

const DEFAULT_STATUSES: Omit<StatusDraft, "tempId">[] = [
  { name: "Todo", code: "TODO", isCompleted: false },
  { name: "In Progress", code: "IN_PROGRESS", isCompleted: false },
  { name: "Done", code: "DONE", isCompleted: true },
];

function buildDrafts(statuses: TaskStatus[]): StatusDraft[] {
  return statuses.map((s) => ({
    tempId: String(s.id),
    id: s.id,
    name: s.name,
    code: s.code,
    isCompleted: s.isCompleted,
  }));
}

export function SpaceDetailModal({
  workspaceId,
  open,
  onOpenChange,
  space,
  onSuccess,
  trigger,
}: SpaceDetailProps) {
  const isEdit = Boolean(space);
  const { createSpace, updateSpace, isCreating, isUpdating } = useSpace(
    workspaceId,
    space?.id,
  );

  const queryClient = useQueryClient();

  // Cùng scope với SpaceTasks (theo user) để board cập nhật khi đổi trạng thái
  const userId = useAuthStore((s) => s.user?.id);
  const spaceScope = React.useMemo(
    () => TASK_QUERY_KEYS.space(userId, workspaceId, space?.id ?? 0),
    [userId, workspaceId, space?.id],
  );

  const { data: existingStatuses } = useQuery({
    queryKey: TASK_QUERY_KEYS.statuses(spaceScope),
    queryFn: () => taskService.statuses(workspaceId, space!.id),
    enabled: isEdit && Boolean(space?.id) && open === true,
  });

  const { mutateAsync: createStatus } = useMutation({
    mutationFn: (dto: Parameters<typeof taskService.createStatus>[1]) =>
      taskService.createStatus(workspaceId, dto),
  });

  const { mutateAsync: updateStatus } = useMutation({
    mutationFn: ({
      statusId,
      dto,
      spaceId,
    }: {
      statusId: number;
      dto: Parameters<typeof taskService.updateStatus>[3];
      spaceId: number;
    }) => taskService.updateStatus(workspaceId, statusId, spaceId, dto),
  });

  const { mutateAsync: deleteStatus } = useMutation({
    mutationFn: ({
      statusId,
      spaceId,
    }: {
      statusId: number;
      spaceId: number;
    }) => taskService.deleteStatus(workspaceId, statusId, spaceId),
  });

  const isSubmitting = isCreating || isUpdating;

  const [form, setForm] = React.useState<FormState>(initial);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [statuses, setStatuses] = React.useState<StatusDraft[]>([]);

  // Initialize statuses when modal opens
  React.useEffect(() => {
    if (!open) return;
    if (isEdit && existingStatuses) {
      setStatuses(buildDrafts(existingStatuses));
    } else if (!isEdit) {
      setStatuses(
        DEFAULT_STATUSES.map((s, i) => ({
          ...s,
          tempId: `new-${i}-${Date.now()}`,
        })),
      );
    }
  }, [open, isEdit, existingStatuses]);

  React.useEffect(() => {
    if (space) {
      setForm({
        name: space.name,
        description: space.description ?? "",
        icon: space.icon ?? "",
        displayOrder: space.displayOrder ?? 1,
      });
    } else {
      setForm(initial);
    }
    setErrors({});
  }, [space, open]);

  const handleChange = <K extends keyof FormState>(
    field: K,
    value: FormState[K],
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Vui lòng nhập tên space.";
    else if (form.name.length > 255)
      errs.name = "Tên space không được vượt quá 255 ký tự.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Status draft helpers ────────────────────────────────────────────────────

  const addStatus = () => {
    setStatuses((prev) => [
      ...prev,
      {
        tempId: `new-${Date.now()}`,
        name: "",
        code: "",
        isCompleted: false,
      },
    ]);
  };

  const updateStatusDraft = (
    tempId: string,
    patch: Partial<Omit<StatusDraft, "tempId">>,
  ) => {
    setStatuses((prev) =>
      prev.map((s) => {
        if (s.tempId !== tempId) return s;
        const next = { ...s, ...patch };
        // auto-update code if name changed and code was auto-generated
        if ("name" in patch && next.code === toCode(s.name)) {
          next.code = toCode(next.name);
        }
        return next;
      }),
    );
  };

  const removeStatus = (tempId: string) => {
    setStatuses((prev) =>
      prev.map((s) => (s.tempId === tempId ? { ...s, _deleted: true } : s)),
    );
  };

  // ── Submit ──────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!validate() || isSubmitting) return;

    try {
      let savedSpace: SpaceItem;

      if (isEdit && space) {
        const dto: UpdateSpaceDto = {
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          icon: form.icon.trim() || null,
          displayOrder: form.displayOrder,
        };
        savedSpace = await updateSpace({ id: space.id, dto });
      } else {
        // Trạng thái được tạo cùng space (1 transaction) thay cho bộ mặc định của backend
        const dto: CreateSpaceDto = {
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          icon: form.icon.trim() || undefined,
          displayOrder: form.displayOrder,
          statuses: statuses
            .filter((s) => !s._deleted && s.name.trim())
            .map((s, i) => ({
              name: s.name.trim(),
              code: s.code || toCode(s.name) || `STATUS_${i + 1}`,
              isCompleted: s.isCompleted,
            })),
        };
        savedSpace = await createSpace(dto);
      }

      // Apply status changes
      const visible = statuses.filter((s) => !s._deleted);
      const deleted = statuses.filter((s) => s._deleted && s.id !== undefined);

      const statusErrors: string[] = [];

      await Promise.allSettled([
        // Delete removed statuses (edit mode only)
        ...deleted.map((s) =>
          deleteStatus({ statusId: s.id!, spaceId: savedSpace.id }).catch(() =>
            statusErrors.push(`Xóa trạng thái "${s.name}" thất bại`),
          ),
        ),
        // Create new statuses (edit mode — khi tạo space đã gửi kèm statuses)
        ...visible
          .filter((s) => isEdit && !s.id && s.name.trim())
          .map((s, i) =>
            createStatus({
              spaceId: savedSpace.id,
              name: s.name.trim(),
              code: s.code || toCode(s.name),
              displayOrder: (existingStatuses?.length ?? 0) + i + 1,
              isCompleted: s.isCompleted,
            }).catch(() =>
              statusErrors.push(`Tạo trạng thái "${s.name}" thất bại`),
            ),
          ),
        // Update existing statuses (edit mode — name, isCompleted changed)
        ...visible
          .filter((s) => s.id !== undefined)
          .map((s) => {
            const orig = existingStatuses?.find((x) => x.id === s.id);
            if (
              !orig ||
              (orig.name === s.name && orig.isCompleted === s.isCompleted)
            )
              return Promise.resolve();
            return updateStatus({
              statusId: s.id!,
              spaceId: savedSpace.id,
              dto: { name: s.name.trim(), isCompleted: s.isCompleted },
            }).catch(() =>
              statusErrors.push(`Cập nhật trạng thái "${s.name}" thất bại`),
            );
          }),
      ]);

      await queryClient.invalidateQueries({ queryKey: spaceScope });

      if (statusErrors.length > 0) {
        toast.add({
          title: isEdit
            ? "Cập nhật thành công (có lỗi phụ)"
            : "Tạo space thành công (có lỗi phụ)",
          description: statusErrors.join("; "),
          type: "warning",
        });
      } else {
        toast.add({
          title: isEdit ? "Cập nhật thành công" : "Tạo space thành công",
          description: isEdit
            ? `Space "${savedSpace.name}" đã được cập nhật.`
            : `Space "${savedSpace.name}" đã được tạo.`,
          type: "success",
        });
      }

      onSuccess?.(savedSpace);
      onOpenChange?.(false);
    } catch (err: unknown) {
      const error = err as {
        response?: { data?: { message?: string | string[] } };
        message?: string;
      };
      const msg = error?.response?.data?.message || error?.message;
      const display = Array.isArray(msg)
        ? msg.join(", ")
        : msg || "Có lỗi xảy ra, vui lòng thử lại.";
      toast.add({
        title: isEdit ? "Cập nhật thất bại" : "Tạo space thất bại",
        description: display,
        type: "error",
      });
    }
  };

  const visibleStatuses = statuses.filter((s) => !s._deleted);

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      trigger={trigger}
      size="2xl"
      title={isEdit ? "Cập nhật Space" : "Tạo Space mới"}
      description={
        isEdit
          ? `Chỉnh sửa thông tin space "${space?.name}".`
          : "Tạo không gian con để phân chia nội dung trong workspace."
      }
      icon={
        isEdit ? (
          <Pencil className="size-5 text-primary" />
        ) : (
          <PlusCircle className="size-5 text-primary" />
        )
      }
      cancelText="Hủy bỏ"
      confirmText={isEdit ? "Lưu thay đổi" : "Tạo space"}
      isLoading={isSubmitting}
      onConfirm={handleSubmit}
    >
      <form
        className="grid grid-cols-2 gap-x-5 gap-y-0 py-1"
        onSubmit={(e) => e.preventDefault()}
      >
        {/* ── LEFT: Thông tin space ─────────────────────────────────────── */}
        <div className="flex flex-col gap-4 border-r pr-5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Thông tin
          </p>

          {/* Tên */}
          <div className="space-y-1.5">
            <Label htmlFor="sp-name" className="text-xs font-semibold">
              Tên Space <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <FolderOpen className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
              <Input
                id="sp-name"
                placeholder="VD: General, Design, Backend..."
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
                className={`pl-9 ${errors.name ? "border-destructive focus-visible:ring-destructive/20" : ""}`}
              />
            </div>
            {errors.name && (
              <p className="text-[11px] text-destructive">{errors.name}</p>
            )}
          </div>

          {/* Mô tả */}
          <div className="space-y-1.5 flex-1">
            <Label htmlFor="sp-desc" className="text-xs font-semibold">
              Mô tả
            </Label>
            <Textarea
              id="sp-desc"
              rows={5}
              placeholder="Mô tả mục đích của space này..."
              value={form.description}
              onChange={(e) => handleChange("description", e.target.value)}
              className="text-xs resize-none"
            />
          </div>

          {/* Icon */}
          <div className="space-y-1.5">
            <Label
              htmlFor="sp-icon"
              className="text-xs font-semibold flex items-center justify-between"
            >
              <span className="flex items-center gap-1.5">
                <Layers className="size-3.5 text-muted-foreground" />
                Tên Icon Lucide
              </span>
              {form.icon && (
                <span className="text-[11px] text-muted-foreground font-normal">
                  Xem trước:
                </span>
              )}
            </Label>
            <div className="relative flex items-center">
              <Input
                id="sp-icon"
                placeholder="VD: LayoutList, Rocket, Palette..."
                value={form.icon}
                onChange={(e) => handleChange("icon", e.target.value)}
                className="pr-10"
              />
              <div className="absolute right-2.5 flex items-center justify-center pointer-events-none text-muted-foreground size-5">
                <MenuIcon name={form.icon || null} className="size-4" />
              </div>
            </div>
          </div>

          {/* Thứ tự hiển thị */}
          <div className="space-y-1.5">
            <Label htmlFor="sp-order" className="text-xs font-semibold">
              Thứ tự hiển thị
            </Label>
            <Input
              id="sp-order"
              type="number"
              min={1}
              value={form.displayOrder}
              onChange={(e) =>
                handleChange("displayOrder", parseInt(e.target.value, 10) || 1)
              }
              placeholder="1"
              className="w-32"
            />
          </div>
        </div>

        {/* ── RIGHT: Trạng thái công việc ──────────────────────────────── */}
        <div className="flex flex-col gap-3 pl-1">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Trạng thái
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-6 text-[11px] gap-1 px-2"
              onClick={addStatus}
            >
              <Plus className="size-3" />
              Thêm
            </Button>
          </div>

          <p className="text-[11px] text-muted-foreground -mt-1">
            Các trạng thái dùng để theo dõi tiến độ task trong space này.
          </p>

          {visibleStatuses.length === 0 ? (
            <div className="flex flex-1 items-center justify-center py-8 text-[11px] text-muted-foreground italic">
              Chưa có trạng thái nào. Nhấn &quot;Thêm&quot; để tạo mới.
            </div>
          ) : (
            <div className="space-y-1.5 overflow-y-auto max-h-64 pr-0.5">
              {visibleStatuses.map((s) => (
                <StatusRow
                  key={s.tempId}
                  draft={s}
                  onChange={(patch) => updateStatusDraft(s.tempId, patch)}
                  onRemove={() => removeStatus(s.tempId)}
                />
              ))}
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
}

interface StatusRowProps {
  draft: StatusDraft;
  onChange: (patch: Partial<Omit<StatusDraft, "tempId">>) => void;
  onRemove: () => void;
}

function StatusRow({ draft, onChange, onRemove }: StatusRowProps) {
  return (
    <div className="flex items-center gap-2 group rounded-md border bg-muted/30 px-2 py-1.5">
      <GripVertical className="size-3.5 text-muted-foreground/40 shrink-0" />

      {/* Completed toggle */}
      <button
        type="button"
        onClick={() => onChange({ isCompleted: !draft.isCompleted })}
        className="shrink-0 text-muted-foreground hover:text-primary transition-colors"
        title={draft.isCompleted ? "Hoàn thành" : "Chưa hoàn thành"}
      >
        {draft.isCompleted ? (
          <CheckCircle2 className="size-3.5 text-green-500" />
        ) : (
          <Circle className="size-3.5" />
        )}
      </button>

      {/* Name */}
      <Input
        value={draft.name}
        onChange={(e) => onChange({ name: e.target.value })}
        placeholder="Tên trạng thái..."
        className="h-6 text-xs flex-1 min-w-0 border-transparent bg-transparent shadow-none focus-visible:border-input focus-visible:bg-background px-1"
      />

      {/* Code */}
      <Input
        value={draft.code}
        onChange={(e) =>
          onChange({
            code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ""),
          })
        }
        placeholder="CODE"
        className="h-6 text-[10px] w-24 shrink-0 font-mono border-transparent bg-transparent shadow-none focus-visible:border-input focus-visible:bg-background px-1 text-muted-foreground"
      />

      {/* Delete */}
      <button
        type="button"
        onClick={onRemove}
        className="shrink-0 text-muted-foreground/40 hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
        title="Xóa trạng thái"
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  );
}

export const SpaceDetail = SpaceDetailModal;
