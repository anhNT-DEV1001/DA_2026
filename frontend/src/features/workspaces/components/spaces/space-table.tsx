"use client";

import * as React from "react";
import { DataTable, type ColumnDef } from "@/components/common/data-table";
import { Modal } from "@/components/common/modal";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { useAuthStore } from "@/stores/auth-store";
import { useSpace, useSpaceList } from "../../hooks";
import type { SpaceItem, SpaceQueryParams } from "../../types";
import { SpaceDetailModal } from "./space-detail";
import { SpaceFilter } from "./space-filter";
import { Calendar, FolderOpen, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SpaceTableProps {
  workspaceId: number;
  className?: string;
}

function formatDate(dateStr?: string | null): string {
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

export function SpaceTable({ workspaceId, className }: SpaceTableProps) {
  const permissions = useAuthStore((s) => s.permissions);

  const canCreate = React.useMemo(
    () => permissions.some((p) => p.code === "WORKSPACE_CREATE"),
    [permissions],
  );
  const canUpdate = React.useMemo(
    () => permissions.some((p) => p.code === "WORKSPACE_UPDATE"),
    [permissions],
  );
  const canDelete = React.useMemo(
    () => permissions.some((p) => p.code === "WORKSPACE_DELETE"),
    [permissions],
  );

  const [params, setParams] = React.useState<SpaceQueryParams>({
    page: 1,
    limit: 10,
  });
  const [spaceToEdit, setSpaceToEdit] = React.useState<SpaceItem | null>(null);
  const [spaceToDelete, setSpaceToDelete] = React.useState<SpaceItem | null>(
    null,
  );

  const { data: queryData, isLoading } = useSpaceList(workspaceId, params);
  const { deleteSpace, isDeleting } = useSpace(workspaceId);

  const items: SpaceItem[] = React.useMemo(() => {
    if (!queryData) return [];
    if (Array.isArray(queryData)) return queryData;
    return queryData.items || [];
  }, [queryData]);

  const total: number | undefined = React.useMemo(() => {
    if (!queryData) return undefined;
    if (Array.isArray(queryData)) return queryData.length;
    return queryData.meta?.itemCount;
  }, [queryData]);

  const page = params.page ?? 1;
  const pageSize = params.limit ?? 10;

  const handleConfirmDelete = async () => {
    if (!spaceToDelete) return;
    try {
      await deleteSpace(spaceToDelete.id);
      toast.add({
        title: "Xóa thành công",
        description: `Space "${spaceToDelete.name}" đã được xóa.`,
        type: "success",
      });
      setSpaceToDelete(null);
    } catch (err: unknown) {
      const error = err as { message?: string };
      toast.add({
        title: "Xóa thất bại",
        description: error?.message || "Có lỗi xảy ra, vui lòng thử lại.",
        type: "error",
      });
    }
  };

  const columns = React.useMemo<ColumnDef<SpaceItem>[]>(
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
        id: "name",
        header: "Tên Space",
        accessorKey: "name",
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 text-primary">
              <FolderOpen className="size-4" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-sm text-foreground truncate max-w-[220px]">
                {row.name}
              </span>
              {row.description && (
                <span className="text-xs text-muted-foreground truncate max-w-[220px]">
                  {row.description}
                </span>
              )}
            </div>
          </div>
        ),
      },
      {
        id: "displayOrder",
        header: "Thứ tự",
        accessorKey: "displayOrder",
        align: "center",
        width: 90,
        cell: ({ row }) => (
          <span className="text-xs font-mono text-muted-foreground">
            {row.displayOrder ?? 1}
          </span>
        ),
      },
      {
        id: "createdAt",
        header: "Ngày tạo",
        accessorKey: "createdAt",
        width: 150,
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="size-3.5 text-muted-foreground/70 shrink-0" />
            <span className="truncate">{formatDate(row.createdAt)}</span>
          </div>
        ),
      },
      {
        id: "actions",
        header: "Thao tác",
        align: "right",
        width: 90,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1">
            {canUpdate && (
              <Button
                variant="ghost"
                size="icon-xs"
                className="size-7 hover:bg-muted text-muted-foreground hover:text-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  setSpaceToEdit(row);
                }}
                title="Chỉnh sửa space"
              >
                <Pencil className="size-3.5" />
              </Button>
            )}
            {canDelete && (
              <Button
                variant="ghost"
                size="icon-xs"
                className="size-7 hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  setSpaceToDelete(row);
                }}
                title="Xóa space"
              >
                <Trash2 className="size-3.5" />
              </Button>
            )}
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [page, pageSize, canUpdate, canDelete],
  );

  return (
    <div className={cn("space-y-4", className)}>
      <SpaceFilter
        workspaceId={workspaceId}
        params={params}
        onParamsChange={setParams}
        canCreate={canCreate}
      />

      <DataTable
        rowKey="id"
        columns={columns}
        data={items}
        isLoading={isLoading}
        emptyIcon={<FolderOpen className="size-10 text-muted-foreground/40" />}
        emptyText="Chưa có space nào"
        emptyDescription="Workspace này chưa có space nào. Tạo space để phân chia nội dung."
        pagination={{
          page,
          pageSize,
          total,
          onPageChange: (p) => setParams((prev) => ({ ...prev, page: p })),
          onPageSizeChange: (s) =>
            setParams((prev) => ({ ...prev, limit: s, page: 1 })),
          disabled: isLoading,
        }}
      />

      {/* Modal xác nhận xóa */}
      <Modal
        open={Boolean(spaceToDelete)}
        onOpenChange={(open) => {
          if (!open) setSpaceToDelete(null);
        }}
        size="sm"
        variant="destructive"
        title="Xác nhận xóa Space"
        description={
          <>
            Bạn có chắc chắn muốn xóa space{" "}
            <strong className="text-foreground font-semibold">
              &ldquo;{spaceToDelete?.name}&rdquo;
            </strong>{" "}
            không?
          </>
        }
        cancelText="Hủy bỏ"
        confirmText={isDeleting ? "Đang xóa..." : "Xác nhận xóa"}
        confirmVariant="destructive"
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
      />

      {/* Modal chỉnh sửa space */}
      {canUpdate && (
        <SpaceDetailModal
          workspaceId={workspaceId}
          open={Boolean(spaceToEdit)}
          onOpenChange={(open) => {
            if (!open) setSpaceToEdit(null);
          }}
          space={spaceToEdit}
          onSuccess={() => setSpaceToEdit(null)}
        />
      )}
    </div>
  );
}
