"use client";

import * as React from "react";
import { Modal } from "@/components/common/modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { useSpace } from "../../hooks";
import type { CreateSpaceDto, SpaceItem, UpdateSpaceDto } from "../../types";
import { FolderOpen, Pencil, PlusCircle } from "lucide-react";

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
  displayOrder: number;
}

const initial: FormState = { name: "", description: "", displayOrder: 1 };

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
  const isSubmitting = isCreating || isUpdating;

  const [form, setForm] = React.useState<FormState>(initial);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (space) {
      setForm({
        name: space.name,
        description: space.description ?? "",
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

  const handleSubmit = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!validate() || isSubmitting) return;

    try {
      if (isEdit && space) {
        const dto: UpdateSpaceDto = {
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          displayOrder: form.displayOrder,
        };
        const updated = await updateSpace({ id: space.id, dto });
        toast.add({
          title: "Cập nhật thành công",
          description: `Space "${updated.name}" đã được cập nhật.`,
          type: "success",
        });
        onSuccess?.(updated);
      } else {
        const dto: CreateSpaceDto = {
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          displayOrder: form.displayOrder,
        };
        const created = await createSpace(dto);
        toast.add({
          title: "Tạo space thành công",
          description: `Space "${created.name}" đã được tạo.`,
          type: "success",
        });
        onSuccess?.(created);
      }
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

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      trigger={trigger}
      size="md"
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
      <form className="space-y-4 py-1" onSubmit={(e) => e.preventDefault()}>
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
        <div className="space-y-1.5">
          <Label htmlFor="sp-desc" className="text-xs font-semibold">
            Mô tả
          </Label>
          <Textarea
            id="sp-desc"
            rows={3}
            placeholder="Mô tả mục đích của space này..."
            value={form.description}
            onChange={(e) => handleChange("description", e.target.value)}
            className="text-xs resize-none"
          />
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
      </form>
    </Modal>
  );
}

export const SpaceDetail = SpaceDetailModal;
