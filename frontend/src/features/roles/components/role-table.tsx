"use client";

import * as React from "react";
import { DataTable, type ColumnDef } from "@/components/common/data-table";
import { Modal } from "@/components/common/modal";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { useRouter } from "next/navigation";
import { useRole, useRoleList } from "../hooks";
import type { RoleItem, RoleQueryParams } from "../types";
import { Shield, Pencil, Trash2, Calendar, ShieldCheck } from "lucide-react";

export interface RoleTableProps {
  data?: RoleItem[];
  total?: number;
  isLoading?: boolean;
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  onEdit?: (role: RoleItem) => void;
  onDelete?: (role: RoleItem) => void;
  queryParams?: RoleQueryParams;
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "—";
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return dateStr;
  }
}

export function RoleTable({
  data: externalData,
  total: externalTotal,
  isLoading: externalIsLoading,
  page: externalPage,
  pageSize: externalPageSize,
  onPageChange: externalOnPageChange,
  onPageSizeChange: externalOnPageSizeChange,
  onEdit,
  onDelete,
  queryParams,
}: RoleTableProps) {
  const router = useRouter();

  // Quản lý internal pagination nếu parent component không truyền vào
  const [internalPage, setInternalPage] = React.useState(1);
  const [internalPageSize, setInternalPageSize] = React.useState(10);

  const isControlled = externalData !== undefined;
  const page = externalPage ?? internalPage;
  const pageSize = externalPageSize ?? internalPageSize;

  // Lấy dữ liệu từ server nếu không truyền data từ ngoài vào
  const { data: queryData, isLoading: isQueryLoading } = useRoleList(
    isControlled
      ? undefined
      : {
          page,
          limit: pageSize,
          ...queryParams,
        },
  );

  const { deleteRole, isDeleting } = useRole();

  // State cho dialog xác nhận xóa
  const [roleToDelete, setRoleToDelete] = React.useState<RoleItem | null>(null);

  // Chuẩn hóa dữ liệu trả về từ API
  const items: RoleItem[] = React.useMemo(() => {
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
    if (!roleToDelete) return;
    try {
      if (onDelete) {
        onDelete(roleToDelete);
      } else {
        await deleteRole(roleToDelete.id);
        toast.add({
          title: "Xóa thành công",
          description: `Vai trò "${roleToDelete.name}" đã được xóa khỏi hệ thống.`,
          type: "success",
        });
      }
      setRoleToDelete(null);
    } catch (err: unknown) {
      const error = err as { message?: string };
      console.error("Lỗi khi xóa vai trò:", err);
      toast.add({
        title: "Xóa thất bại",
        description:
          error?.message || "Có lỗi xảy ra khi xóa vai trò. Vui lòng thử lại!",
        type: "error",
      });
    }
  };

  // Định nghĩa các cột cho bảng vai trò
  const columns = React.useMemo<ColumnDef<RoleItem>[]>(
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
        header: "Tên vai trò",
        accessorKey: "name",
        cell: ({ row }) => (
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
              <Shield className="size-4" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-foreground truncate">
                {row.name}
              </span>
              <span className="text-[11px] text-muted-foreground font-mono">
                ID: #{row.id}
              </span>
            </div>
          </div>
        ),
      },
      {
        header: "Mô tả",
        accessorKey: "description",
        cell: ({ row }) =>
          row.description ? (
            <p className="text-xs text-muted-foreground line-clamp-2 max-w-md">
              {row.description}
            </p>
          ) : (
            <span className="text-xs text-muted-foreground/60 italic">
              Chưa có mô tả
            </span>
          ),
      },
      {
        header: "Ngày tạo",
        accessorKey: "createdAt",
        width: 170,
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="size-3.5 text-muted-foreground/70" />
            <span>{formatDate(row.createdAt)}</span>
          </div>
        ),
      },
      {
        id: "actions",
        header: "Thao tác",
        align: "right",
        width: 100,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="icon-xs"
              className="size-7 hover:bg-primary/10 text-muted-foreground hover:text-primary"
              onClick={(e) => {
                e.stopPropagation();
                router.push(
                  `/roles/permissions?roleId=${row.id}&roleName=${encodeURIComponent(row.name)}`,
                );
              }}
              title="Phân quyền thao tác"
            >
              <ShieldCheck className="size-3.5" />
            </Button>
            {onEdit && (
              <Button
                variant="ghost"
                size="icon-xs"
                className="size-7 hover:bg-muted text-muted-foreground hover:text-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(row);
                }}
                title="Chỉnh sửa vai trò"
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
                setRoleToDelete(row);
              }}
              title="Xóa vai trò"
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
        emptyText="Chưa có vai trò nào"
        emptyDescription="Hiện chưa có vai trò nào được tạo trong hệ thống hoặc không có kết quả phù hợp."
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
        open={Boolean(roleToDelete)}
        onOpenChange={(open) => {
          if (!open) setRoleToDelete(null);
        }}
        size="sm"
        variant="destructive"
        title="Xác nhận xóa vai trò"
        description={
          <>
            Bạn có chắc chắn muốn xóa vai trò{" "}
            <strong className="text-foreground font-semibold">
              &ldquo;{roleToDelete?.name}&rdquo;
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
