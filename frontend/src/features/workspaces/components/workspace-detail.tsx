"use client";

import * as React from "react";
import { Modal } from "@/components/common/modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import { useWorkspace } from "../hooks";
import type {
  CreateWorkspaceDto,
  UpdateWorkspaceDto,
  WorkspaceItem,
} from "../types";
import {
  Briefcase,
  Building2,
  Globe,
  Lock,
  Pencil,
  PlusCircle,
  Sparkles,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface WorkspaceDetailProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  workspace?: WorkspaceItem | null;
  onSuccess?: (savedWorkspace: WorkspaceItem) => void;
  trigger?: React.ReactNode;
}

interface FormState {
  name: string;
  slug: string;
  description: string;
  mode: "public" | "private";
  displayOrder: number;
  isStar: boolean;
}

const initialFormState: FormState = {
  name: "",
  slug: "",
  description: "",
  mode: "private",
  displayOrder: 1,
  isStar: false,
};

/**
 * Hàm sinh slug thân thiện từ tên tiếng Việt
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");
}

export function WorkspaceDetailModal({
  open,
  onOpenChange,
  workspace,
  onSuccess,
  trigger,
}: WorkspaceDetailProps) {
  const isEdit = Boolean(workspace);

  const { createWorkspace, updateWorkspace, isCreating, isUpdating } =
    useWorkspace(workspace?.id);

  const isSubmitting = isCreating || isUpdating;

  const [form, setForm] = React.useState<FormState>(initialFormState);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [isSlugManual, setIsSlugManual] = React.useState(false);

  React.useEffect(() => {
    if (workspace) {
      setForm({
        name: workspace.name || "",
        slug: workspace.slug || "",
        description: workspace.description || "",
        mode: workspace.mode || "private",
        displayOrder: workspace.displayOrder ?? 1,
        isStar: Boolean(workspace.isStar),
      });
      setIsSlugManual(true);
    } else {
      setForm(initialFormState);
      setIsSlugManual(false);
    }
    setErrors({});
  }, [workspace, open]);

  const handleChange = <K extends keyof FormState>(
    field: K,
    value: FormState[K],
  ) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      // Nếu đang tạo mới và chưa tự gõ slug thì tự động sinh slug theo tên
      if (field === "name" && !isSlugManual && !isEdit) {
        next.slug = slugify(value as string);
      }
      return next;
    });

    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsSlugManual(true);
    const formattedSlug = slugify(e.target.value);
    setForm((prev) => ({ ...prev, slug: formattedSlug }));

    if (errors.slug) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.slug;
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!form.name.trim()) {
      newErrors.name = "Vui lòng nhập tên workspace.";
    } else if (form.name.trim().length > 255) {
      newErrors.name = "Tên workspace không được vượt quá 255 ký tự.";
    }

    if (form.slug && form.slug.length > 255) {
      newErrors.slug = "Đường dẫn slug không được vượt quá 255 ký tự.";
    }

    if (form.description && form.description.length > 255) {
      newErrors.description = "Mô tả không được vượt quá 255 ký tự.";
    }

    if (
      form.displayOrder !== undefined &&
      (isNaN(form.displayOrder) || form.displayOrder < 0)
    ) {
      newErrors.displayOrder = "Thứ tự hiển thị phải là số không âm.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!validate() || isSubmitting) return;

    try {
      if (isEdit && workspace) {
        const dto: UpdateWorkspaceDto = {
          name: form.name.trim(),
          slug: form.slug.trim() || undefined,
          description: form.description.trim() || undefined,
          mode: form.mode,
          displayOrder: Number(form.displayOrder) || 1,
          isStar: form.isStar,
        };

        const updated = await updateWorkspace({ id: workspace.id, dto });

        toast.add({
          title: "Cập nhật thành công",
          description: `Workspace "${updated.name}" đã được cập nhật.`,
          type: "success",
        });

        onSuccess?.(updated);
        onOpenChange?.(false);
      } else {
        const dto: CreateWorkspaceDto = {
          name: form.name.trim(),
          slug: form.slug.trim() || undefined,
          description: form.description.trim() || undefined,
          mode: form.mode,
          displayOrder: Number(form.displayOrder) || 1,
          isStar: form.isStar,
        };

        const created = await createWorkspace(dto);

        toast.add({
          title: "Tạo workspace thành công",
          description: `Không gian làm việc "${created.name}" đã sẵn sàng.`,
          type: "success",
        });

        onSuccess?.(created);
        onOpenChange?.(false);
      }
    } catch (error: unknown) {
      const err = error as {
        response?: { data?: { message?: string | string[] } };
        message?: string;
      };
      const apiMessage = err?.response?.data?.message || err?.message;
      const displayMessage = Array.isArray(apiMessage)
        ? apiMessage.join(", ")
        : apiMessage || "Có lỗi xảy ra khi lưu workspace. Vui lòng thử lại!";

      toast.add({
        title: isEdit ? "Cập nhật thất bại" : "Tạo workspace thất bại",
        description: displayMessage,
        type: "error",
      });
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      trigger={trigger}
      size="lg"
      title={isEdit ? "Cập nhật Workspace" : "Tạo Workspace mới"}
      description={
        isEdit
          ? `Chỉnh sửa thông tin và quyền riêng tư của workspace "${workspace?.name}".`
          : "Tạo không gian làm việc để quản lý tài nguyên, dự án và phân quyền thành viên."
      }
      icon={
        isEdit ? (
          <Pencil className="size-5 text-primary" />
        ) : (
          <PlusCircle className="size-5 text-primary" />
        )
      }
      cancelText="Hủy bỏ"
      confirmText={isEdit ? "Lưu thay đổi" : "Tạo workspace"}
      isLoading={isSubmitting}
      onConfirm={handleSubmit}
    >
      <form className="space-y-4 py-1" onSubmit={(e) => e.preventDefault()}>
        {/* Tên Workspace */}
        <div className="space-y-1.5">
          <Label htmlFor="ws-name" className="text-xs font-semibold">
            Tên Workspace <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <Input
              id="ws-name"
              placeholder="VD: Không gian DA 2026"
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              className={
                errors.name
                  ? "border-destructive focus-visible:ring-destructive/20"
                  : ""
              }
            />
          </div>
          {errors.name && (
            <p className="text-[11px] text-destructive">{errors.name}</p>
          )}
        </div>

        {/* Slug */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="ws-slug" className="text-xs font-semibold">
              Định danh (Slug)
            </Label>
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Sparkles className="size-3 text-primary" /> Tự động sinh nếu để
              trống
            </span>
          </div>
          <div className="flex items-center rounded-md border border-input bg-muted/20 px-3 py-1 text-xs text-muted-foreground focus-within:ring-2 focus-within:ring-ring focus-within:border-primary">
            <span className="shrink-0 select-none text-muted-foreground font-mono">
              /workspaces/
            </span>
            <input
              id="ws-slug"
              type="text"
              value={form.slug}
              onChange={handleSlugChange}
              placeholder="workspace-da-2026"
              className="w-full bg-transparent px-1 font-mono text-xs text-foreground focus:outline-none placeholder:text-muted-foreground/50"
            />
          </div>
          {errors.slug && (
            <p className="text-[11px] text-destructive">{errors.slug}</p>
          )}
        </div>

        {/* Mô tả */}
        <div className="space-y-1.5">
          <Label htmlFor="ws-description" className="text-xs font-semibold">
            Mô tả
          </Label>
          <Textarea
            id="ws-description"
            rows={3}
            placeholder="Mô tả mục đích hoặc thông tin chung về không gian làm việc này..."
            value={form.description}
            onChange={(e) => handleChange("description", e.target.value)}
            className="text-xs resize-none"
          />
          {errors.description && (
            <p className="text-[11px] text-destructive">{errors.description}</p>
          )}
        </div>

        {/* Thứ tự hiển thị & Đánh dấu sao (isStar) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* Thứ tự hiển thị */}
          <div className="space-y-1.5">
            <Label htmlFor="ws-display-order" className="text-xs font-semibold">
              Thứ tự hiển thị
            </Label>
            <Input
              id="ws-display-order"
              type="number"
              min={1}
              value={form.displayOrder}
              onChange={(e) =>
                handleChange("displayOrder", parseInt(e.target.value, 10) || 1)
              }
              placeholder="1"
            />
            {errors.displayOrder && (
              <p className="text-[11px] text-destructive">
                {errors.displayOrder}
              </p>
            )}
          </div>

          {/* Đánh dấu sao (isStar) */}
          <div className="flex items-center justify-between p-3  mt-auto">
            <div className="flex items-center gap-2.5">
              <Star
                className={cn(
                  "size-4 transition-colors",
                  form.isStar
                    ? "fill-amber-400 text-amber-500"
                    : "text-muted-foreground",
                )}
              />
              <div className="flex flex-col">
                <span className="text-xs font-semibold">Yêu thích (Star)</span>
                {/* <span className="text-[10px] text-muted-foreground">
                  Ưu tiên hiển thị trên đầu
                </span> */}
              </div>
            </div>
            <Switch
              checked={form.isStar}
              onCheckedChange={(checked) => handleChange("isStar", checked)}
            />
          </div>
        </div>

        {/* Chế độ hiển thị (Mode: private / public) */}
        <div className="space-y-2 pt-1">
          <Label className="text-xs font-semibold">Chế độ hiển thị</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Private Mode */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => handleChange("mode", "private")}
              onKeyDown={(e) =>
                e.key === "Enter" && handleChange("mode", "private")
              }
              className={cn(
                "flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all select-none text-left",
                form.mode === "private"
                  ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                  : "border-border hover:bg-muted/40",
              )}
            >
              <div
                className={cn(
                  "size-8 rounded-lg flex shrink-0 items-center justify-center mt-0.5",
                  form.mode === "private"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground",
                )}
              >
                <Lock className="size-4" />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold text-foreground">
                  Riêng tư (Private)
                </span>
                <span className="text-[11px] text-muted-foreground leading-snug">
                  Chỉ những thành viên được phân quyền mới có thể truy cập.
                </span>
              </div>
            </div>

            {/* Public Mode */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => handleChange("mode", "public")}
              onKeyDown={(e) =>
                e.key === "Enter" && handleChange("mode", "public")
              }
              className={cn(
                "flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all select-none text-left",
                form.mode === "public"
                  ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                  : "border-border hover:bg-muted/40",
              )}
            >
              <div
                className={cn(
                  "size-8 rounded-lg flex shrink-0 items-center justify-center mt-0.5",
                  form.mode === "public"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground",
                )}
              >
                <Globe className="size-4" />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold text-foreground">
                  Công khai (Public)
                </span>
                <span className="text-[11px] text-muted-foreground leading-snug">
                  Tất cả thành viên trong hệ thống đều có thể tìm thấy và xem.
                </span>
              </div>
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
}

// Alias export
export const WorkspaceDetail = WorkspaceDetailModal;
