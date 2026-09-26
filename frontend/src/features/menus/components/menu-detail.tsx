"use client";

import * as React from "react";
import { Modal } from "@/components/common/modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import { MenuIcon } from "./menu-icon";
import { useMenu, useMenuList } from "../hooks";
import type { CreateMenuDto, MenuItem, UpdateMenuDto } from "../types";
import { Plus, Pencil, Layers, FolderTree, Hash, Compass } from "lucide-react";

export interface MenuDetailProps {
  /**
   * Trạng thái mở/đóng modal
   */
  open?: boolean;
  /**
   * Callback khi thay đổi trạng thái mở/đóng
   */
  onOpenChange?: (open: boolean) => void;
  /**
   * Dữ liệu menu cần chỉnh sửa. Nếu null hoặc undefined thì modal ở chế độ "Thêm mới"
   */
  menu?: MenuItem | null;
  /**
   * ID menu cha mặc định khi tạo mới submenu (tùy chọn)
   */
  defaultParentId?: number | null;
  /**
   * Callback sau khi tạo hoặc cập nhật menu thành công
   */
  onSuccess?: (savedMenu: MenuItem) => void;
  /**
   * Nút kích hoạt mở modal nếu dùng kiểu uncontrolled
   */
  trigger?: React.ReactNode;
}

interface FormState {
  name: string;
  alias: string;
  route: string;
  icon: string;
  parentId: number | null;
  displayOrder: number;
  isSideBarDisplay: boolean;
  isActive: boolean;
}

const initialFormState: FormState = {
  name: "",
  alias: "",
  route: "",
  icon: "",
  parentId: null,
  displayOrder: 0,
  isSideBarDisplay: true,
  isActive: true,
};

export function MenuDetailModal({
  open,
  onOpenChange,
  menu,
  defaultParentId = null,
  onSuccess,
  trigger,
}: MenuDetailProps) {
  const isEdit = Boolean(menu);

  const { createMenu, updateMenu, isCreating, isUpdating } = useMenu(menu?.id);
  const isSubmitting = isCreating || isUpdating;

  // Lấy danh sách menu để làm danh sách lựa chọn menu cha
  const { data: menuListData } = useMenuList({ limit: 100 });
  const parentCandidates = React.useMemo(() => {
    const list = Array.isArray(menuListData)
      ? menuListData
      : menuListData?.items || [];
    // Loại bỏ chính menu đang sửa để tránh menu cha tlgrỏ vào chính nó
    return list.filter((item) => !menu || item.id !== menu.id);
  }, [menuListData, menu]);

  const [form, setForm] = React.useState<FormState>(initialFormState);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  // Điền dữ liệu khi mở modal hoặc thay đổi menu
  React.useEffect(() => {
    if (menu) {
      setForm({
        name: menu.name ?? "",
        alias: menu.alias ?? "",
        route: menu.route ?? "",
        icon: menu.icon ?? "",
        parentId: menu.parentId ?? null,
        displayOrder: menu.displayOrder ?? 0,
        isSideBarDisplay: menu.isSideBarDisplay ?? true,
        isActive: menu.isActive ?? true,
      });
    } else {
      setForm({
        ...initialFormState,
        parentId: defaultParentId,
      });
    }
    setErrors({});
  }, [menu, defaultParentId, open]);

  // Cập nhật giá trị trường form
  const handleChange = <K extends keyof FormState>(
    field: K,
    value: FormState[K],
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));

    // Xóa lỗi tương ứng khi người dùng nhập lại
    if (errors[field]) {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!form.name.trim()) {
      newErrors.name = "Vui lòng nhập tên menu";
    }

    if (!form.alias.trim()) {
      newErrors.alias = "Vui lòng nhập mã định danh (alias)";
    } else if (!/^[A-Za-z0-9_-]+$/.test(form.alias.trim())) {
      newErrors.alias = "Alias chỉ bao gồm chữ cái, số, gạch dưới (_) hoặc (-)";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!validate() || isSubmitting) return;

    try {
      if (isEdit && menu) {
        const dto: UpdateMenuDto = {
          name: form.name.trim(),
          alias: form.alias.trim(),
          route: form.route.trim() || undefined,
          icon: form.icon.trim() || undefined,
          parentId: form.parentId !== null ? form.parentId : undefined,
          displayOrder: Number(form.displayOrder) || 0,
          isSideBarDisplay: form.isSideBarDisplay,
          isActive: form.isActive,
        };

        const updated = await updateMenu({ id: menu.id, dto });

        toast.add({
          title: "Cập nhật thành công",
          description: `Menu "${updated.name}" đã được cập nhật thành công.`,
          type: "success",
        });

        onSuccess?.(updated);
        onOpenChange?.(false);
      } else {
        const dto: CreateMenuDto = {
          name: form.name.trim(),
          alias: form.alias.trim(),
          route: form.route.trim() || undefined,
          icon: form.icon.trim() || undefined,
          parentId: form.parentId !== null ? form.parentId : undefined,
          displayOrder: Number(form.displayOrder) || 0,
          isSideBarDisplay: form.isSideBarDisplay,
        };

        const created = await createMenu(dto);

        toast.add({
          title: "Tạo menu thành công",
          description: `Menu "${created.name}" đã được tạo thành công.`,
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
        : apiMessage || "Có lỗi xảy ra khi lưu menu. Vui lòng thử lại!";

      toast.add({
        title: isEdit ? "Cập nhật thất bại" : "Tạo menu thất bại",
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
      size="3xl"
      title={isEdit ? "Cập nhật Menu" : "Thêm Menu Mới"}
      description={
        isEdit
          ? `Chỉnh sửa thông tin đường dẫn, icon và quyền hiển thị cho "${menu?.name}".`
          : "Khởi tạo menu mới để cấu hình điều hướng hệ thống và hiển thị thanh bên."
      }
      icon={
        isEdit ? (
          <Pencil className="size-5 text-primary" />
        ) : (
          <Plus className="size-5 text-primary" />
        )
      }
      cancelText="Hủy bỏ"
      confirmText={isEdit ? "Lưu thay đổi" : "Tạo menu"}
      isLoading={isSubmitting}
      onConfirm={handleSubmit}
    >
      <form className="space-y-4 py-1" onSubmit={(e) => e.preventDefault()}>
        {/* Hàng 1: Tên menu & Alias */}
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="menu-name" className="text-xs font-semibold">
              Tên menu <span className="text-destructive">*</span>
            </Label>
            <Input
              id="menu-name"
              placeholder="VD: Quản lý Menu, Cài đặt..."
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

          <div className="space-y-1.5">
            <Label htmlFor="menu-alias" className="text-xs font-semibold">
              Alias (Mã định danh) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="menu-alias"
              placeholder="VD: SYSTEM_MENUS"
              value={form.alias}
              onChange={(e) => handleChange("alias", e.target.value)}
              className={
                errors.alias
                  ? "border-destructive focus-visible:ring-destructive/20"
                  : ""
              }
            />
            {errors.alias && (
              <p className="text-xs text-destructive font-medium">
                {errors.alias}
              </p>
            )}
          </div>
        </div>

        {/* Hàng 2: Đường dẫn & Icon */}
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label
              htmlFor="menu-route"
              className="text-xs font-semibold flex items-center gap-1.5"
            >
              <Compass className="size-3.5 text-muted-foreground" />
              Đường dẫn (Route)
            </Label>
            <Input
              id="menu-route"
              placeholder="VD: /system/menus"
              value={form.route}
              onChange={(e) => handleChange("route", e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="menu-icon"
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
                id="menu-icon"
                placeholder="VD: Settings, Folder, Home..."
                value={form.icon}
                onChange={(e) => handleChange("icon", e.target.value)}
                className="pr-10"
              />
              <div className="absolute right-2.5 flex items-center justify-center pointer-events-none text-muted-foreground size-5">
                <MenuIcon name={form.icon || null} className="size-4" />
              </div>
            </div>
          </div>
        </div>

        {/* Hàng 3: Menu cha & Thứ tự hiển thị */}
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold flex items-center gap-1.5">
              <FolderTree className="size-3.5 text-muted-foreground" />
              Menu cha (Cấp trên)
            </Label>
            <Select
              value={form.parentId !== null ? String(form.parentId) : "root"}
              onValueChange={(val) =>
                handleChange("parentId", val === "root" ? null : Number(val))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Chọn menu cha" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="root">
                  <span className="text-muted-foreground font-normal">
                    — Không có (Menu gốc / Root) —
                  </span>
                </SelectItem>
                {parentCandidates.map((parent) => (
                  <SelectItem key={parent.id} value={String(parent.id)}>
                    <div className="flex items-center gap-2">
                      <MenuIcon
                        name={parent.icon}
                        className="size-3.5 text-muted-foreground"
                      />
                      <span>{parent.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="menu-order"
              className="text-xs font-semibold flex items-center gap-1.5"
            >
              <Hash className="size-3.5 text-muted-foreground" />
              Thứ tự hiển thị
            </Label>
            <Input
              id="menu-order"
              type="number"
              min={0}
              placeholder="0"
              value={form.displayOrder}
              onChange={(e) =>
                handleChange("displayOrder", Number(e.target.value) || 0)
              }
            />
          </div>
        </div>

        {/* Hàng 4: Cấu hình hiển thị sidebar & trạng thái hoạt động */}
        <div className="pt-2 border-t border-border/50 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/20">
            <div className="space-y-0.5 pr-2">
              <Label
                htmlFor="menu-sidebar"
                className="text-xs font-medium cursor-pointer"
              >
                Hiển thị Sidebar
              </Label>
              <p className="text-[11px] text-muted-foreground leading-snug">
                Cho phép hiển thị trên thanh điều hướng bên trái
              </p>
            </div>
            <Switch
              id="menu-sidebar"
              size="sm"
              checked={form.isSideBarDisplay}
              onCheckedChange={(checked) =>
                handleChange("isSideBarDisplay", checked)
              }
            />
          </div>

          {isEdit && (
            <div className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/20">
              <div className="space-y-0.5 pr-2">
                <Label
                  htmlFor="menu-active"
                  className="text-xs font-medium cursor-pointer"
                >
                  Trạng thái hoạt động
                </Label>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  Bật/tắt trạng thái sử dụng của menu này
                </p>
              </div>
              <Switch
                id="menu-active"
                size="sm"
                checked={form.isActive}
                onCheckedChange={(checked) => handleChange("isActive", checked)}
              />
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
}

/* ==========================================================================
   Convenience Buttons (Nút thêm & nút sửa đi kèm Modal tự quản lý state)
   ========================================================================== */

export interface MenuCreateButtonProps {
  defaultParentId?: number | null;
  onSuccess?: (created: MenuItem) => void;
  className?: string;
  size?: "default" | "sm" | "xs" | "lg";
  children?: React.ReactNode;
}

/**
 * Nút "Thêm menu" tích hợp sẵn Modal thêm mới
 */
export function MenuCreateButton({
  defaultParentId,
  onSuccess,
  className,
  size = "sm",
  children,
}: MenuCreateButtonProps) {
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
            Thêm menu
          </>
        )}
      </Button>

      <MenuDetailModal
        open={open}
        onOpenChange={setOpen}
        menu={null}
        defaultParentId={defaultParentId}
        onSuccess={onSuccess}
      />
    </>
  );
}

export interface MenuEditButtonProps {
  menu: MenuItem;
  onSuccess?: (updated: MenuItem) => void;
  className?: string;
}

/**
 * Nút Icon "Chỉnh sửa menu" tích hợp sẵn Modal cập nhật
 */
export function MenuEditButton({
  menu,
  onSuccess,
  className,
}: MenuEditButtonProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="icon-xs"
        onClick={() => setOpen(true)}
        className={className}
        title={`Chỉnh sửa menu ${menu.name}`}
      >
        <Pencil className="size-3.5" />
      </Button>

      <MenuDetailModal
        open={open}
        onOpenChange={setOpen}
        menu={menu}
        onSuccess={onSuccess}
      />
    </>
  );
}

export const MenuDetail = MenuDetailModal;
