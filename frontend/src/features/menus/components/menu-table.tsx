"use client";

import * as React from "react";
import { DataTable, ColumnDef } from "@/components/common/data-table";
import { MenuItem } from "../types";
import { useMenuList, useMenu } from "../hooks";
import { MenuIcon } from "./menu-icon";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/common/modal";
import { toast } from "@/components/ui/toast";
import {
  Pencil,
  Trash2,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
} from "lucide-react";

export interface MenuTableProps {
  data?: MenuItem[];
  total?: number;
  isLoading?: boolean;
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  onEdit?: (menu: MenuItem) => void;
  onDelete?: (menu: MenuItem) => void;
}

export function MenuTable({
  data: externalData,
  total: externalTotal,
  isLoading: externalIsLoading,
  page: externalPage,
  pageSize: externalPageSize,
  onPageChange: externalOnPageChange,
  onPageSizeChange: externalOnPageSizeChange,
  onEdit,
  onDelete,
}: MenuTableProps) {
  // Quản lý internal pagination nếu parent không truyền vào
  const [internalPage, setInternalPage] = React.useState(1);
  const [internalPageSize, setInternalPageSize] = React.useState(10);

  const isControlled = externalData !== undefined;
  const page = externalPage ?? internalPage;
  const pageSize = externalPageSize ?? internalPageSize;

  // Lấy dữ liệu từ server nếu không truyền data từ ngoài vào
  const { data: queryData, isLoading: isQueryLoading } = useMenuList(
    isControlled ? undefined : { page, limit: pageSize },
  );

  const { deleteMenu, isDeleting } = useMenu();

  // State cho dialog xác nhận xóa
  const [menuToDelete, setMenuToDelete] = React.useState<MenuItem | null>(null);

  // Xử lý dữ liệu chuẩn hóa từ API
  const items: MenuItem[] = React.useMemo(() => {
    if (externalData) return externalData;
    if (!queryData) return [];
    if (Array.isArray(queryData)) return queryData;
    return queryData.items || [];
  }, [externalData, queryData]);

  const total: number | undefined = React.useMemo(() => {
    if (typeof externalTotal === "number") return externalTotal;
    if (!queryData) return undefined;
    if (Array.isArray(queryData)) return queryData.length;
    return queryData.meta?.itemCount;
  }, [externalTotal, queryData]);

  const isLoading =
    externalIsLoading ?? (isControlled ? false : isQueryLoading);

  const handlePageChange = (newPage: number) => {
    if (externalOnPageChange) {
      externalOnPageChange(newPage);
    } else {
      setInternalPage(newPage);
    }
  };

  const handlePageSizeChange = (newPageSize: number) => {
    if (externalOnPageSizeChange) {
      externalOnPageSizeChange(newPageSize);
    } else {
      setInternalPageSize(newPageSize);
      setInternalPage(1);
    }
  };

  const handleConfirmDelete = async () => {
    if (!menuToDelete) return;
    try {
      if (onDelete) {
        onDelete(menuToDelete);
      } else {
        await deleteMenu(menuToDelete.id);
        toast.add({
          title: "Xóa thành công",
          description: `Menu "${menuToDelete.name}" đã được xóa khỏi hệ thống.`,
          type: "success",
        });
      }
      setMenuToDelete(null);
    } catch (err) {
      console.error("Lỗi khi xóa menu:", err);
      toast.add({
        title: "Xóa thất bại",
        description: "Có lỗi xảy ra khi xóa menu. Vui lòng thử lại!",
        type: "error",
      });
    }
  };

  // Định nghĩa các cột cho bảng Menu
  const columns = React.useMemo<ColumnDef<MenuItem>[]>(
    () => [
      {
        id: "index",
        header: "#",
        align: "center",
        width: 50,
        cell: ({ index }) => (
          <span className="text-xs text-muted-foreground font-medium">
            {(page - 1) * pageSize + index + 1}
          </span>
        ),
      },
      {
        id: "icon",
        header: "Icon",
        align: "center",
        width: 60,
        cell: ({ row }) => (
          <div className="flex justify-center items-center">
            <div className="flex size-7 items-center justify-center rounded-md bg-muted/80 text-foreground border border-border/50">
              <MenuIcon name={row.icon} className="size-4" />
            </div>
          </div>
        ),
      },
      {
        header: "Tên Menu",
        accessorKey: "name",
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium text-foreground">{row.name}</span>
            <span className="text-xs text-muted-foreground font-mono">
              {row.alias}
            </span>
          </div>
        ),
      },
      {
        header: "Đường dẫn",
        accessorKey: "route",
        cell: ({ row }) =>
          row.route ? (
            <code className="px-2 py-0.5 rounded bg-muted/70 text-xs font-mono text-foreground border border-border/40">
              {row.route}
            </code>
          ) : (
            <span className="text-xs text-muted-foreground italic">
              Không có route
            </span>
          ),
      },
      {
        header: "Thứ tự",
        accessorKey: "displayOrder",
        align: "center",
        width: 80,
        cell: ({ row }) => (
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-secondary text-secondary-foreground">
            {row.displayOrder}
          </span>
        ),
      },
      {
        header: "Sidebar",
        accessorKey: "isSideBarDisplay",
        align: "center",
        width: 120,
        cell: ({ row }) =>
          row.isSideBarDisplay ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400">
              <Eye className="size-3.5" />
              Hiển thị
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <EyeOff className="size-3.5" />
              Ẩn
            </span>
          ),
      },
      {
        header: "Trạng thái",
        accessorKey: "isActive",
        align: "center",
        width: 130,
        cell: ({ row }) => (
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
              row.isActive
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                : "bg-muted text-muted-foreground border border-border"
            }`}
          >
            {row.isActive ? (
              <>
                <CheckCircle2 className="size-3 text-emerald-500" />
                Hoạt động
              </>
            ) : (
              <>
                <XCircle className="size-3 text-muted-foreground" />
                Tạm khóa
              </>
            )}
          </span>
        ),
      },
      {
        id: "actions",
        header: "Thao tác",
        align: "right",
        width: 100,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1">
            {onEdit && (
              <Button
                variant="ghost"
                size="icon-xs"
                className="size-7 hover:bg-muted text-muted-foreground hover:text-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(row);
                }}
                title="Chỉnh sửa menu"
              >
                <Pencil className="size-3.5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon-xs"
              className="size-7 hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                setMenuToDelete(row);
              }}
              title="Xóa menu"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ),
      },
    ],
    [page, pageSize, onEdit],
  );

  return (
    <>
      <DataTable
        columns={columns}
        data={items}
        isLoading={isLoading}
        emptyText="Chưa có menu nào"
        emptyDescription="Hiện chưa có dữ liệu menu hoặc không tìm thấy kết quả phù hợp."
        pagination={{
          page,
          pageSize,
          total,
          onPageChange: handlePageChange,
          onPageSizeChange: handlePageSizeChange,
          disabled: isLoading,
        }}
      />

      {/* Modal xác nhận xóa */}
      <Modal
        open={Boolean(menuToDelete)}
        onOpenChange={(open) => {
          if (!open) setMenuToDelete(null);
        }}
        size="sm"
        variant="destructive"
        title="Xác nhận xóa menu"
        description={
          <>
            Bạn có chắc chắn muốn xóa menu{" "}
            <strong className="text-foreground font-semibold">
              &ldquo;{menuToDelete?.name}&rdquo;
            </strong>{" "}
            không? Hành động này sẽ không thể hoàn tác.
          </>
        }
        cancelText="Hủy bỏ"
        confirmText={isDeleting ? "Đang xóa..." : "Xác nhận xóa"}
        confirmVariant="destructive"
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
      />
    </>
  );
}
