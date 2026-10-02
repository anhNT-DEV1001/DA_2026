"use client";

import * as React from "react";
import { Modal } from "@/components/common/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import { MasterDataPicker, useMasterDataByGroup } from "@/features/masterdata";
import { useMenuPermission } from "../hooks";
import type { MenuItem, PermissionItem } from "../types";
import {
  Plus,
  RotateCw,
  Check,
  X,
  Pencil,
  Trash2,
  ShieldCheck,
  Loader2,
  Key,
} from "lucide-react";

export interface MenuPermissionDetailProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  menu?: MenuItem | null;
  menuId?: number;
  menuName?: string;
  trigger?: React.ReactNode;
}

export function MenuPermissionDetailModal({
  open,
  onOpenChange,
  menu,
  menuId,
  menuName,
  trigger,
}: MenuPermissionDetailProps) {
  const targetMenuId = menu?.id ?? menuId;
  const targetMenuName = menu?.name ?? menuName ?? "Menu";

  // Lấy dữ liệu master data nhóm ACTION để tra cứu Tên hiển thị (Name) của từng action value
  const { data: actionMasterData = [] } = useMasterDataByGroup("ACTION");

  // Hàm helper lấy tên hiển thị của action từ value (ví dụ: ACTION001 -> Xem)
  const getActionName = React.useCallback(
    (actionValue: string) => {
      if (!actionValue) return "—";
      const found = actionMasterData.find(
        (m) => m.value === actionValue || String(m.id) === actionValue,
      );
      return found?.name || actionValue;
    },
    [actionMasterData],
  );

  const {
    permissions,
    isLoadingPermissions,
    refetchPermissions,
    createPermission,
    updatePermission,
    deletePermission,
    isCreating,
    isUpdating,
    isDeleting,
  } = useMenuPermission(targetMenuId);

  // State thêm dòng inline mới
  const [isAdding, setIsAdding] = React.useState(false);
  const [newRow, setNewRow] = React.useState({
    name: "",
    code: "",
    action: "READ",
  });

  // State chỉnh sửa dòng inline
  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [editRow, setEditRow] = React.useState({
    name: "",
    code: "",
    action: "READ",
  });

  // Tự động gợi ý mã Code dựa trên tên thao tác & alias của Menu
  const handleNewNameChange = (name: string) => {
    let generatedCode = newRow.code;

    // Nếu code chưa được sửa thủ công hoặc đang rỗng, gợi ý code theo định dạng ALIAS_ACTION
    if (!newRow.code || newRow.code === generatedCode) {
      const aliasPrefix = menu?.alias ? `${menu.alias.toUpperCase()}_` : "";
      const cleanName = name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]/g, "_")
        .toUpperCase();
      generatedCode = `${aliasPrefix}${cleanName}`.replace(/_+/g, "_");
    }

    setNewRow((prev) => ({
      ...prev,
      name,
      code: generatedCode,
    }));
  };

  // Mở dòng thêm mới
  const handleStartAdd = () => {
    setNewRow({
      name: "",
      code: menu?.alias ? `${menu.alias.toUpperCase()}_` : "",
      action: "READ",
    });
    setIsAdding(true);
  };

  // Lưu dòng mới tạo
  const handleSaveNew = async () => {
    if (!targetMenuId) {
      toast.add({
        title: "Lỗi dữ liệu",
        description: "Không xác định được Menu ID hợp lệ.",
        type: "error",
      });
      return;
    }

    if (!newRow.name.trim()) {
      toast.add({
        title: "Thiếu thông tin",
        description: "Vui lòng nhập tên thao tác.",
        type: "warning",
      });
      return;
    }

    if (!newRow.code.trim()) {
      toast.add({
        title: "Thiếu thông tin",
        description: "Vui lòng nhập mã thao tác (code).",
        type: "warning",
      });
      return;
    }

    try {
      await createPermission({
        name: newRow.name.trim(),
        code: newRow.code.trim().toUpperCase(),
        action: newRow.action,
        menuId: targetMenuId,
      });

      toast.add({
        title: "Thêm thành công",
        description: `Đã thêm thao tác "${newRow.name}" cho menu ${targetMenuName}.`,
        type: "success",
      });

      setIsAdding(false);
      setNewRow({ name: "", code: "", action: "READ" });
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.add({
        title: "Tạo thao tác thất bại",
        description: err?.message || "Có lỗi xảy ra khi tạo mới thao tác.",
        type: "error",
      });
    }
  };

  // Mở chỉnh sửa 1 dòng
  const handleStartEdit = (item: PermissionItem) => {
    setEditingId(item.id);
    setEditRow({
      name: item.name,
      code: item.code,
      action: item.action,
    });
  };

  // Lưu dòng chỉnh sửa
  const handleSaveEdit = async (id: number) => {
    if (!targetMenuId) return;

    if (!editRow.name.trim() || !editRow.code.trim()) {
      toast.add({
        title: "Thiếu thông tin",
        description: "Tên và mã thao tác không được để trống.",
        type: "warning",
      });
      return;
    }

    try {
      await updatePermission({
        id,
        dto: {
          name: editRow.name.trim(),
          code: editRow.code.trim().toUpperCase(),
          action: editRow.action,
          menuId: targetMenuId,
        },
      });

      toast.add({
        title: "Cập nhật thành công",
        description: `Đã cập nhật thao tác "${editRow.name}".`,
        type: "success",
      });

      setEditingId(null);
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.add({
        title: "Cập nhật thất bại",
        description: err?.message || "Có lỗi xảy ra khi cập nhật thao tác.",
        type: "error",
      });
    }
  };

  // Xóa 1 thao tác
  const handleDelete = async (item: PermissionItem) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa thao tác "${item.name}"?`)) return;

    try {
      await deletePermission(item.id);
      toast.add({
        title: "Đã xóa thao tác",
        description: `Đã xóa thao tác "${item.name}" khỏi menu ${targetMenuName}.`,
        type: "success",
      });
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.add({
        title: "Xóa thất bại",
        description: err?.message || "Không thể xóa thao tác này.",
        type: "error",
      });
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      trigger={trigger}
      size="4xl"
      title={`Cấu hình quyền thao tác - ${targetMenuName}`}
      description="Quản lý danh sách các hành động/quyền thao tác chi tiết dành cho Menu này."
      icon={<ShieldCheck className="size-5 text-primary" />}
      showFooter={true}
      cancelText={null}
      confirmText={null}
      footer={
        <div className="flex w-full items-center justify-between">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Key className="size-3.5 text-muted-foreground" />
            <span>
              Tổng số thao tác:{" "}
              <strong className="text-foreground">{permissions.length}</strong>
            </span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange?.(false)}
            className="font-medium px-5"
          >
            Đóng
          </Button>
        </div>
      }
    >
      <div className="space-y-4 py-1">
        {/* Thanh công cụ (Top Action Bar) */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            onClick={handleStartAdd}
            disabled={isAdding || isLoadingPermissions}
            className="gap-1.5 text-xs font-semibold bg-primary hover:bg-primary/90 shadow-sm"
          >
            <Plus className="size-4" />
            Thêm quyền thao tác
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => refetchPermissions()}
            disabled={isLoadingPermissions}
            className="gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <RotateCw
              className={`size-3.5 ${isLoadingPermissions ? "animate-spin" : ""}`}
            />
            Làm mới
          </Button>
        </div>

        {/* Bảng danh sách Permission */}
        <div className="rounded-xl border border-border/70 overflow-hidden bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border/70 bg-muted/40 font-semibold text-muted-foreground uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-3.5 text-center w-12">STT</th>
                  <th className="py-3 px-3.5 min-w-[180px]">Tên thao tác</th>
                  <th className="py-3 px-3.5 min-w-[150px]">
                    Mã thao tác (Code)
                  </th>
                  <th className="py-3 px-3.5 min-w-[160px]">
                    Hành động (Action)
                  </th>
                  <th className="py-3 px-3.5 text-center w-28">Trạng thái</th>
                  <th className="py-3 px-3.5 text-center w-24">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {/* Dòng thêm mới Inline */}
                {isAdding && (
                  <tr className="bg-primary/5 dark:bg-primary/10 transition-colors">
                    <td className="py-2.5 px-3.5 text-center font-medium text-primary">
                      <div className="size-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center mx-auto">
                        +
                      </div>
                    </td>
                    <td className="py-2.5 px-2">
                      <Input
                        placeholder="Tên thao tác *"
                        value={newRow.name}
                        onChange={(e) => handleNewNameChange(e.target.value)}
                        className="h-8 text-xs bg-background"
                        autoFocus
                      />
                    </td>
                    <td className="py-2.5 px-2">
                      <Input
                        placeholder="Mã code duy nhất *"
                        value={newRow.code}
                        onChange={(e) =>
                          setNewRow((prev) => ({
                            ...prev,
                            code: e.target.value,
                          }))
                        }
                        className="h-8 text-xs font-mono uppercase bg-background"
                      />
                    </td>
                    <td className="py-2.5 px-2">
                      <MasterDataPicker
                        group="ACTION"
                        value={newRow.action}
                        onValueChange={(val) =>
                          setNewRow((prev) => ({
                            ...prev,
                            action: val,
                          }))
                        }
                        placeholder="Chọn hành động"
                        triggerClassName="h-8 text-xs bg-background"
                      />
                    </td>
                    <td className="py-2.5 px-3.5 text-center">
                      <Badge
                        variant="secondary"
                        className="bg-blue-500/15 text-blue-600 dark:text-blue-400 font-medium text-[10px] px-2 py-0.5"
                      >
                        Mới
                      </Badge>
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          type="button"
                          size="icon-xs"
                          onClick={handleSaveNew}
                          disabled={isCreating}
                          className="size-7 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md shadow-xs"
                          title="Lưu"
                        >
                          {isCreating ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Check className="size-4" />
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => setIsAdding(false)}
                          disabled={isCreating}
                          className="size-7 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md"
                          title="Hủy"
                        >
                          <X className="size-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )}

                {/* Danh sách các dòng đã lưu */}
                {permissions.map((item, index) => {
                  const isEditing = editingId === item.id;

                  if (isEditing) {
                    return (
                      <tr
                        key={item.id}
                        className="bg-amber-500/5 dark:bg-amber-500/10 transition-colors"
                      >
                        <td className="py-2.5 px-3.5 text-center font-medium text-muted-foreground">
                          {index + 1}
                        </td>
                        <td className="py-2.5 px-2">
                          <Input
                            value={editRow.name}
                            onChange={(e) =>
                              setEditRow((prev) => ({
                                ...prev,
                                name: e.target.value,
                              }))
                            }
                            className="h-8 text-xs bg-background"
                            autoFocus
                          />
                        </td>
                        <td className="py-2.5 px-2">
                          <Input
                            value={editRow.code}
                            onChange={(e) =>
                              setEditRow((prev) => ({
                                ...prev,
                                code: e.target.value,
                              }))
                            }
                            className="h-8 text-xs font-mono uppercase bg-background"
                          />
                        </td>
                        <td className="py-2.5 px-2">
                          <MasterDataPicker
                            group="ACTION"
                            value={editRow.action}
                            onValueChange={(val) =>
                              setEditRow((prev) => ({
                                ...prev,
                                action: val,
                              }))
                            }
                            placeholder="Chọn hành động"
                            triggerClassName="h-8 text-xs bg-background"
                          />
                        </td>
                        <td className="py-2.5 px-3.5 text-center">
                          <Badge
                            variant="secondary"
                            className="bg-amber-500/15 text-amber-600 dark:text-amber-400 font-medium text-[10px] px-2 py-0.5"
                          >
                            Sửa
                          </Badge>
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              type="button"
                              size="icon-xs"
                              onClick={() => handleSaveEdit(item.id)}
                              disabled={isUpdating}
                              className="size-7 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md shadow-xs"
                              title="Lưu cập nhật"
                            >
                              {isUpdating ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : (
                                <Check className="size-4" />
                              )}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => setEditingId(null)}
                              disabled={isUpdating}
                              className="size-7 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md"
                              title="Hủy"
                            >
                              <X className="size-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <td className="py-3 px-3.5 text-center font-medium text-muted-foreground">
                        {index + 1}
                      </td>
                      <td className="py-3 px-3.5 font-medium text-foreground">
                        {item.name}
                      </td>
                      <td className="py-3 px-3.5 font-mono text-xs text-primary font-semibold">
                        {item.code}
                      </td>
                      <td className="py-3 px-3.5">
                        <Badge
                          variant="outline"
                          className="text-[11px] font-medium px-2 py-0.5 bg-muted/40 text-foreground border-border/80"
                        >
                          {getActionName(item.action)}
                        </Badge>
                      </td>
                      <td className="py-3 px-3.5 text-center">
                        <Badge
                          variant="secondary"
                          className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium text-[10px] px-2 py-0.5"
                        >
                          Đã lưu
                        </Badge>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => handleStartEdit(item)}
                            className="size-7 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
                            title="Chỉnh sửa"
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => handleDelete(item)}
                            disabled={isDeleting}
                            className="size-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                            title="Xóa"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {/* Trạng thái trống / đang tải */}
                {permissions.length === 0 && !isAdding && (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-12 text-center text-muted-foreground"
                    >
                      {isLoadingPermissions ? (
                        <div className="flex items-center justify-center gap-2 text-xs">
                          <Loader2 className="size-4 animate-spin text-primary" />
                          <span>Đang tải danh sách quyền thao tác...</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center gap-2 py-2">
                          <ShieldCheck className="size-8 text-muted-foreground/40" />
                          <p className="text-xs">
                            Chưa có quyền thao tác nào cho menu này.
                          </p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleStartAdd}
                            className="mt-1 text-xs gap-1.5 font-medium"
                          >
                            <Plus className="size-3.5" />
                            Thêm quyền ngay
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Modal>
  );
}

/* ==========================================================================
   Convenience Button Nút kích hoạt mở Modal Cấu hình Permission
   ========================================================================== */

export interface MenuPermissionButtonProps {
  menu?: MenuItem | null;
  menuId?: number;
  menuName?: string;
  className?: string;
  size?: "default" | "sm" | "xs" | "lg" | "icon" | "icon-xs" | "icon-sm";
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
  children?: React.ReactNode;
}

/**
 * Nút tích hợp sẵn Modal quản lý Permission cho Menu
 */
export function MenuPermissionButton({
  menu,
  menuId,
  menuName,
  className,
  size = "icon-xs",
  variant = "ghost",
  children,
}: MenuPermissionButtonProps) {
  const [open, setOpen] = React.useState(false);
  const targetName = menu?.name ?? menuName ?? "";

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setOpen(true)}
        className={className}
        title={`Cấu hình quyền thao tác cho menu ${targetName}`}
      >
        {children ?? <Key className="size-3.5" />}
      </Button>

      <MenuPermissionDetailModal
        open={open}
        onOpenChange={setOpen}
        menu={menu}
        menuId={menuId}
        menuName={menuName}
      />
    </>
  );
}

export const MenuPermissionDetail = MenuPermissionDetailModal;
