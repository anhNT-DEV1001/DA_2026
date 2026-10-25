"use client";

import * as React from "react";
import { DataTable, type ColumnDef } from "@/components/common/data-table";
import { Modal } from "@/components/common/modal";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { useAuthStore } from "@/stores/auth-store";
import { useSpace, useSpaceList, useSpaceMemberList } from "../../hooks";
import type { SpaceItem, SpaceQueryParams } from "../../types";
import { SpaceDetailModal } from "./space-detail";
import { SpaceMemberJoinModal } from "./space-member-join";
import { SpaceFilter } from "./space-filter";
import { Calendar, FolderOpen, Loader2, Pencil, Trash2, UserPlus, Users } from "lucide-react";
import { cn } from "@/lib/utils";

/** Hiển thị số thành viên đã tham gia space */
function SpaceMemberCountBadge({
  workspaceId,
  spaceId,
}: {
  workspaceId: number;
  spaceId: number;
}) {
  const { data, isLoading } = useSpaceMemberList(workspaceId, spaceId, {
    page: 1,
    limit: 1,
  });

  if (isLoading) {
    return <Loader2 className="size-3 animate-spin text-muted-foreground/50" />;
  }

  const count = Array.isArray(data) ? data.length : (data?.meta?.itemCount ?? 0);

  return (
    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-muted/60 text-muted-foreground border border-border/50">
      <Users className="size-3 shrink-0" />
      <span>{count}</span>
    </div>
  );
}

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
  const [spaceToDelete, setSpaceToDelete] = React.useState<SpaceItem | null>(null);
  const [spaceForMember, setSpaceForMember] = React.useState<SpaceItem | null>(null);

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
        id: "memberCount",
        header: "Thành viên",
        align: "center",
        width: 110,
        cell: ({ row }) => (
          <SpaceMemberCountBadge
            workspaceId={workspaceId}
            spaceId={row.id}
          />
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
        width: 110,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="icon-xs"
              className="size-7 hover:bg-primary/10 text-muted-foreground hover:text-primary"
              onClick={(e) => {
                e.stopPropagation();
                setSpaceForMember(row);
              }}
              title="Thêm thành viên vào space"
            >
              <UserPlus className="size-3.5" />
            </Button>
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
    [page, pageSize, canUpdate, canDelete, setSpaceForMember],
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

      {/* Modal thêm thành viên vào space */}
      {spaceForMember && (
        <SpaceMemberJoinModal
          workspaceId={workspaceId}
          spaceId={spaceForMember.id}
          spaceName={spaceForMember.name}
          open={Boolean(spaceForMember)}
          onOpenChange={(open) => {
            if (!open) setSpaceForMember(null);
          }}
          onSuccess={() => {
            // Không đóng modal, để user có thể thêm nhiều người cùng lúc
          }}
        />
      )}
    </div>
  );
}
