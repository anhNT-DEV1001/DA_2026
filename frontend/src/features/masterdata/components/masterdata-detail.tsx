"use client";

import * as React from "react";
import { Modal } from "@/components/common/modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { useCreateMasterData, useUpdateMasterData } from "../hooks";
import type { MasterData, CreateMasterDataDto } from "../types";
import {
  Database,
  Pencil,
  Plus,
  Tag,
  Layers,
  Hash,
  FileText,
} from "lucide-react";

export interface MasterDataDetailProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: MasterData | null;
  defaultGroup?: string;
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}

interface FormState {
  group: string;
  nameGroup: string;
  name: string;
  value: string;
  description: string;
  displayOrder: number;
}

const initialFormState: FormState = {
  group: "",
  nameGroup: "",
  name: "",
  value: "",
  description: "",
  displayOrder: 0,
};

export function MasterDataDetail({
  open,
  onOpenChange,
  item,
  defaultGroup = "",
  onSuccess,
  trigger,
}: MasterDataDetailProps) {
  const isEditing = Boolean(item && item.id);

  const createMutation = useCreateMasterData();
  const updateMutation = useUpdateMasterData();

  const [formData, setFormData] = React.useState<FormState>(initialFormState);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Sync form state khi modal mở hoặc item thay đổi
  React.useEffect(() => {
    if (open) {
      setErrorMsg(null);
      setErrors({});
      if (item) {
        setFormData({
          group: item.group || "",
          nameGroup: item.nameGroup || "",
          name: item.name || "",
          value: item.value || "",
          description: item.description || "",
          displayOrder: item.displayOrder ?? 0,
        });
      } else {
        setFormData({
          ...initialFormState,
          group: defaultGroup || "",
        });
      }
    }
  }, [open, item, defaultGroup]);

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleChange = (field: keyof FormState, value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

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

    if (!formData.group.trim()) {
      newErrors.group = "Vui lòng nhập mã nhóm (Group)";
    }
    if (!formData.name.trim()) {
      newErrors.name = "Vui lòng nhập tên hiển thị (Name)";
    }
    if (!formData.value.trim()) {
      newErrors.value = "Vui lòng nhập giá trị (Value)";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) {
      e.preventDefault();
    }
    setErrorMsg(null);

    if (!validate()) {
      return;
    }

    try {
      const payload: CreateMasterDataDto = {
        group: formData.group.trim().toUpperCase(),
        nameGroup: formData.nameGroup.trim() || undefined,
        name: formData.name.trim(),
        value: formData.value.trim(),
        description: formData.description.trim() || undefined,
        displayOrder: Number(formData.displayOrder) || 0,
      };

      if (isEditing && item?.id) {
        await updateMutation.mutateAsync({
          id: item.id,
          dto: payload,
        });
        toast.add({
          title: "Cập nhật thành công",
          description: `Đã lưu thay đổi cho master data "${payload.name}".`,
          type: "success",
        });
      } else {
        await createMutation.mutateAsync(payload);
        toast.add({
          title: "Tạo mới thành công",
          description: `Đã thêm mới bản ghi master data "${payload.name}".`,
          type: "success",
        });
      }

      onOpenChange(false);
      onSuccess?.();
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Đã có lỗi xảy ra khi lưu master data.";
      setErrorMsg(msg);
      toast.add({
        title: "Thao tác thất bại",
        description: msg,
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
      title={isEditing ? "Cập nhật Master Data" : "Thêm mới Master Data"}
      description={
        isEditing
          ? `Chỉnh sửa thông tin chi tiết danh mục dữ liệu master "${item?.name || item?.value}".`
          : "Điền các thông tin bên dưới để khởi tạo một bản ghi master data mới vào hệ thống."
      }
      icon={
        isEditing ? (
          <Pencil className="size-5 text-primary" />
        ) : (
          <Plus className="size-5 text-primary" />
        )
      }
      cancelText="Hủy bỏ"
      confirmText={isEditing ? "Lưu thay đổi" : "Tạo mới"}
      isLoading={isPending}
      onConfirm={handleSubmit}
    >
      <form className="space-y-4 py-1" onSubmit={handleSubmit}>
        {errorMsg && (
          <div className="p-3 text-xs rounded-lg bg-destructive/10 text-destructive border border-destructive/20 font-medium">
            {errorMsg}
          </div>
        )}

        {/* Hàng 1: Mã Nhóm (group) & Tên Nhóm hiển thị (nameGroup) */}
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label
              htmlFor="md-group"
              className="text-xs font-semibold flex items-center gap-1.5"
            >
              <Tag className="size-3.5 text-muted-foreground" />
              Mã nhóm (Group) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="md-group"
              placeholder="VD: ACTION, GENDER, STATUS..."
              value={formData.group}
              onChange={(e) =>
                handleChange("group", e.target.value.toUpperCase())
              }
              disabled={isPending}
              className={
                errors.group
                  ? "border-destructive focus-visible:ring-destructive/20"
                  : ""
              }
            />
            {errors.group && (
              <p className="text-xs text-destructive font-medium">
                {errors.group}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="md-nameGroup"
              className="text-xs font-semibold flex items-center gap-1.5"
            >
              <Layers className="size-3.5 text-muted-foreground" />
              Tên nhóm hiển thị
            </Label>
            <Input
              id="md-nameGroup"
              placeholder="VD: Thao tác quyền, Giới tính..."
              value={formData.nameGroup}
              onChange={(e) => handleChange("nameGroup", e.target.value)}
              disabled={isPending}
            />
          </div>
        </div>

        {/* Hàng 2: Tên hiển thị (name) & Giá trị (value) */}
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label
              htmlFor="md-name"
              className="text-xs font-semibold flex items-center gap-1.5"
            >
              <Database className="size-3.5 text-muted-foreground" />
              Tên hiển thị (Name) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="md-name"
              placeholder="VD: Xem, Thêm, Nam, Nữ..."
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              disabled={isPending}
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

          <div className="space-y-1.5">
            <Label
              htmlFor="md-value"
              className="text-xs font-semibold flex items-center gap-1.5"
            >
              <Tag className="size-3.5 text-muted-foreground" />
              Giá trị (Value) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="md-value"
              placeholder="VD: ACTION001, MALE, ACTIVE..."
              value={formData.value}
              onChange={(e) => handleChange("value", e.target.value)}
              disabled={isPending}
              className={
                errors.value
                  ? "border-destructive focus-visible:ring-destructive/20"
                  : ""
              }
            />
            {errors.value && (
              <p className="text-xs text-destructive font-medium">
                {errors.value}
              </p>
            )}
          </div>
        </div>

        {/* Hàng 3: Thứ tự hiển thị */}
        <div className="space-y-1.5">
          <Label
            htmlFor="md-displayOrder"
            className="text-xs font-semibold flex items-center gap-1.5"
          >
            <Hash className="size-3.5 text-muted-foreground" />
            Thứ tự hiển thị
          </Label>
          <Input
            id="md-displayOrder"
            type="number"
            min={0}
            placeholder="0"
            value={formData.displayOrder}
            onChange={(e) =>
              handleChange("displayOrder", parseInt(e.target.value, 10) || 0)
            }
            disabled={isPending}
          />
        </div>

        {/* Hàng 4: Mô tả */}
        <div className="space-y-1.5">
          <Label
            htmlFor="md-description"
            className="text-xs font-semibold flex items-center gap-1.5"
          >
            <FileText className="size-3.5 text-muted-foreground" />
            Mô tả chi tiết
          </Label>
          <Textarea
            id="md-description"
            placeholder="Nhập ghi chú hoặc mô tả chi tiết danh mục (nếu có)..."
            value={formData.description}
            onChange={(e) => handleChange("description", e.target.value)}
            disabled={isPending}
            rows={3}
          />
        </div>
      </form>
    </Modal>
  );
}
