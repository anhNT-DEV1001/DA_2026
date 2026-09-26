"use client";

import * as React from "react";
import { Modal } from "@/components/common/modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { useRole } from "../hooks";
import type { CreateRoleDto, RoleItem, UpdateRoleDto } from "../types";
import { Plus, Pencil, ShieldCheck } from "lucide-react";

export interface RoleDetailProps {
  /**
   * Trạng thái mở/đóng modal
   */
  open?: boolean;
  /**
   * Callback khi thay đổi trạng thái mở/đóng
   */
  onOpenChange?: (open: boolean) => void;
  /**
   * Dữ liệu vai trò cần chỉnh sửa. Nếu null hoặc undefined thì modal ở chế độ "Thêm mới"
   */
  role?: RoleItem | null;
  /**
   * Callback sau khi tạo hoặc cập nhật vai trò thành công
   */
  onSuccess?: (savedRole: RoleItem) => void;
  /**
   * Nút kích hoạt mở modal nếu dùng kiểu uncontrolled
   */
  trigger?: React.ReactNode;
}

interface FormState {
  name: string;
  description: string;
}

const initialFormState: FormState = {
  name: "",
  description: "",
};

export function RoleDetailModal({
  open,
  onOpenChange,
  role,
  onSuccess,
  trigger,
}: RoleDetailProps) {
  const isEdit = Boolean(role);

  const { createRole, updateRole, isCreating, isUpdating } = useRole(role?.id);
  const isSubmitting = isCreating || isUpdating;

  const [form, setForm] = React.useState<FormState>(initialFormState);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  // Cập nhật form state khi thay đổi role hoặc mở modal
  React.useEffect(() => {
    if (role) {
      setForm({
        name: role.name ?? "",
        description: role.description ?? "",
      });
    } else {
      setForm(initialFormState);
    }
    setErrors({});
  }, [role, open]);

  const handleChange = <K extends keyof FormState>(
    field: K,
    value: FormState[K],
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));

    // Xóa lỗi khi người dùng thay đổi giá trị
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!form.name.trim()) {
      newErrors.name = "Vui lòng nhập tên vai trò.";
    } else if (form.name.trim().length > 255) {
      newErrors.name = "Tên vai trò không được vượt quá 255 ký tự.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!validate() || isSubmitting) return;

    try {
      if (isEdit && role) {
        const dto: UpdateRoleDto = {
          name: form.name.trim(),
          description: form.description.trim() || undefined,
        };

        const updated = await updateRole({ id: role.id, dto });

        toast.add({
          title: "Cập nhật thành công",
          description: `Vai trò "${updated.name}" đã được cập nhật.`,
          type: "success",
        });

        onSuccess?.(updated);
        onOpenChange?.(false);
      } else {
        const dto: CreateRoleDto = {
          name: form.name.trim(),
          description: form.description.trim() || undefined,
        };

        const created = await createRole(dto);

        toast.add({
          title: "Tạo vai trò thành công",
          description: `Vai trò "${created.name}" đã được tạo thành công.`,
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
        : apiMessage || "Có lỗi xảy ra khi lưu vai trò. Vui lòng thử lại!";

      toast.add({
        title: isEdit ? "Cập nhật thất bại" : "Tạo vai trò thất bại",
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
      size="md"
      title={isEdit ? "Cập nhật vai trò" : "Thêm vai trò mới"}
      description={
        isEdit
          ? `Chỉnh sửa thông tin chi tiết của vai trò "${role?.name}".`
          : "Khởi tạo vai trò mới để cấu hình và gán quyền trong hệ thống."
      }
      icon={
        isEdit ? (
          <Pencil className="size-5 text-primary" />
        ) : (
          <ShieldCheck className="size-5 text-primary" />
        )
      }
      cancelText="Hủy bỏ"
      confirmText={isEdit ? "Lưu thay đổi" : "Tạo vai trò"}
      isLoading={isSubmitting}
      onConfirm={handleSubmit}
    >
      <form className="space-y-4 py-1" onSubmit={(e) => e.preventDefault()}>
        {/* Tên vai trò */}
        <div className="space-y-1.5">
          <Label htmlFor="role-name" className="text-xs font-semibold">
            Tên vai trò <span className="text-destructive">*</span>
          </Label>
          <Input
            id="role-name"
            placeholder="VD: Quản trị viên, Nhân viên..."
            value={form.name}
            onChange={(e) => handleChange("name", e.target.value)}
            className={
              errors.name
                ? "border-destructive focus-visible:ring-destructive/20"
                : ""
            }
          />
          {errors.name && (
            <p className="text-xs text-destructive font-medium">
              {errors.name}
            </p>
          )}
        </div>

        {/* Mô tả vai trò */}
        <div className="space-y-1.5">
          <Label htmlFor="role-description" className="text-xs font-semibold">
            Mô tả vai trò
          </Label>
          <Textarea
            id="role-description"
            rows={4}
            placeholder="Mô tả chức năng, phạm vi phụ trách hoặc quyền hạn của vai trò..."
            value={form.description}
            onChange={(e) => handleChange("description", e.target.value)}
          />
        </div>
      </form>
    </Modal>
  );
}

/* ==========================================================================
   Convenience Buttons
   ========================================================================== */

export interface RoleCreateButtonProps {
  onSuccess?: (created: RoleItem) => void;
  className?: string;
  size?: "default" | "sm" | "xs" | "lg";
  children?: React.ReactNode;
}

/**
 * Nút "Thêm vai trò" tích hợp sẵn Modal thêm mới
 */
export function RoleCreateButton({
  onSuccess,
  className,
  size = "sm",
  children,
}: RoleCreateButtonProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button
        size={size}
        onClick={() => setOpen(true)}
        className={className ?? "gap-1.5 text-xs font-medium"}
      >
        {children ?? (
          <>
            <Plus className="size-3.5" />
            Thêm vai trò
          </>
        )}
      </Button>

      <RoleDetailModal
        open={open}
        onOpenChange={setOpen}
        role={null}
        onSuccess={onSuccess}
      />
    </>
  );
}

export interface RoleEditButtonProps {
  role: RoleItem;
  onSuccess?: (updated: RoleItem) => void;
  className?: string;
}

/**
 * Nút Icon "Chỉnh sửa vai trò" tích hợp sẵn Modal cập nhật
 */
export function RoleEditButton({
  role,
  onSuccess,
  className,
}: RoleEditButtonProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="icon-xs"
        onClick={() => setOpen(true)}
        className={className}
        title={`Chỉnh sửa vai trò ${role.name}`}
      >
        <Pencil className="size-3.5" />
      </Button>

      <RoleDetailModal
        open={open}
        onOpenChange={setOpen}
        role={role}
        onSuccess={onSuccess}
      />
    </>
  );
}

export const RoleDetail = RoleDetailModal;
