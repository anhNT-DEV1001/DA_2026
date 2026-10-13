"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { DataTable, type ColumnDef } from "@/components/common/data-table";
import { Modal } from "@/components/common/modal";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import { useWorkspace, useWorkspaceList } from "../hooks";
import type { WorkspaceItem, WorkspaceQueryParams } from "../types";
import { WorkspaceDetailModal } from "./workspace-detail";
import {
  Briefcase,
  Calendar,
  ExternalLink,
  Globe,
  Lock,
  Pencil,
  Star,
  Trash2,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface WorkspaceTableProps {
  data?: WorkspaceItem[];
  total?: number;
  isLoading?: boolean;
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  onEdit?: (workspace: WorkspaceItem) => void;
  onDelete?: (workspace: WorkspaceItem) => void;
  onSelect?: (workspace: WorkspaceItem) => void;
  queryParams?: WorkspaceQueryParams;
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

function getInitials(name?: string | null): string {
  if (!name) return "W";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function WorkspaceTable({
  data: externalData,
  total: externalTotal,
  isLoading: externalIsLoading,
  page: externalPage,
  pageSize: externalPageSize,
  onPageChange: externalOnPageChange,
  onPageSizeChange: externalOnPageSizeChange,
  onEdit,
  onDelete,
  onSelect,
  queryParams,
  className,
}: WorkspaceTableProps) {
  const router = useRouter();

  // Quản lý pagination nội bộ khi component không nhận props từ ngoài
  const [internalPage, setInternalPage] = React.useState(1);
  const [internalPageSize, setInternalPageSize] = React.useState(10);

  const isControlled = externalData !== undefined;
  const page = externalPage ?? internalPage;
  const pageSize = externalPageSize ?? internalPageSize;

  // Lấy dữ liệu từ API nếu không truyền từ component cha
  const { data: queryData, isLoading: isQueryLoading } = useWorkspaceList(
    isControlled
      ? undefined
      : {
          page,
          limit: pageSize,
          ...queryParams,
        },
  );

  const { deleteWorkspace, updateWorkspace, isDeleting } = useWorkspace();

  // State quản lý Modal xóa và Modal cập nhật
  const [workspaceToDelete, setWorkspaceToDelete] =
    React.useState<WorkspaceItem | null>(null);
  const [workspaceToEdit, setWorkspaceToEdit] =
    React.useState<WorkspaceItem | null>(null);
  const [starTogglingId, setStarTogglingId] = React.useState<number | null>(
    null,
  );

  // Chuẩn hóa danh sách workspaces từ response API
  const items: WorkspaceItem[] = React.useMemo(() => {
    if (externalData) return externalData;
    if (!queryData) return [];
    if (Array.isArray(queryData)) return queryData;
    return queryData.items || [];
  }, [externalData, queryData]);

  // Tổng số bản ghi phục vụ phân trang
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

  // Xử lý bật/tắt yêu thích (Star)
  const handleToggleStar = async (
    e: React.MouseEvent,
    workspace: WorkspaceItem,
  ) => {
    e.stopPropagation();
    if (starTogglingId === workspace.id) return;

    const nextStar = !workspace.isStar;
    setStarTogglingId(workspace.id);

    try {
      await updateWorkspace({
        id: workspace.id,
        dto: { isStar: nextStar },
      });

      toast.add({
        title: nextStar ? "Đã thêm vào mục yêu thích" : "Đã bỏ yêu thích",
        description: `Workspace "${workspace.name}" đã được cập nhật.`,
        type: "success",
      });
    } catch (err: unknown) {
      const error = err as { message?: string };
      toast.add({
        title: "Cập nhật thất bại",
        description:
          error?.message || "Không thể thay đổi trạng thái yêu thích.",
        type: "error",
      });
    } finally {
      setStarTogglingId(null);
    }
  };

  // Xử lý mở chỉnh sửa
  const handleEditClick = (
    e: React.MouseEvent,
    workspace: WorkspaceItem,
  ) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit(workspace);
    } else {
      setWorkspaceToEdit(workspace);
    }
  };

  // Xử lý mở xác nhận xóa
  const handleDeleteClick = (
    e: React.MouseEvent,
    workspace: WorkspaceItem,
  ) => {
    e.stopPropagation();
    setWorkspaceToDelete(workspace);
  };

  // Xác nhận xóa workspace
  const handleConfirmDelete = async () => {
    if (!workspaceToDelete) return;
    try {
      if (onDelete) {
        onDelete(workspaceToDelete);
      } else {
        await deleteWorkspace(workspaceToDelete.id);
        toast.add({
          title: "Xóa thành công",
          description: `Workspace "${workspaceToDelete.name}" đã được xóa.`,
          type: "success",
        });
      }
      setWorkspaceToDelete(null);
    } catch (err: unknown) {
      const error = err as { message?: string };
      console.error("Lỗi khi xóa workspace:", err);
      toast.add({
        title: "Xóa thất bại",
        description:
          error?.message || "Có lỗi xảy ra khi xóa workspace. Vui lòng thử lại!",
        type: "error",
      });
    }
  };

  // Điều hướng tới chi tiết workspace
  const handleNavigate = (workspace: WorkspaceItem) => {
    if (onSelect) {
      onSelect(workspace);
    } else {
      router.push(`/workspaces/${workspace.slug || workspace.id}`);
    }
  };

  const columns = React.useMemo<ColumnDef<WorkspaceItem>[]>(
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
        id: "workspace",
        header: "Tên Workspace",
        accessorKey: "name",
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 text-primary font-semibold text-xs">
              {getInitials(row.name)}
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <span
                  onClick={() => handleNavigate(row)}
                  className="font-semibold text-foreground text-sm hover:text-primary transition-colors cursor-pointer truncate max-w-[240px]"
                  title={row.name}
                >
                  {row.name}
                </span>
                <button
                  type="button"
                  onClick={(e) => handleToggleStar(e, row)}
                  disabled={starTogglingId === row.id}
                  className="inline-flex items-center justify-center text-muted-foreground/60 hover:text-amber-500 transition-colors p-0.5 rounded focus:outline-none"
                  title={row.isStar ? "Bỏ yêu thích" : "Đánh dấu yêu thích"}
                >
                  <Star
                    className={cn(
                      "size-3.5 transition-colors",
                      row.isStar
                        ? "fill-amber-400 text-amber-500"
                        : "hover:fill-amber-200/50",
                    )}
                  />
                </button>
              </div>
              <span className="text-xs text-muted-foreground font-mono truncate max-w-[200px]">
                /workspaces/{row.slug || row.id}
              </span>
            </div>
          </div>
        ),
      },
      {
        id: "mode",
        header: "Chế độ",
        accessorKey: "mode",
        align: "center",
        width: 130,
        cell: ({ row }) => {
          const isPublic = row.mode === "public";
          return (
            <Badge
              variant={isPublic ? "secondary" : "outline"}
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-medium rounded-full",
                isPublic
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                  : "bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20",
              )}
            >
              {isPublic ? (
                <>
                  <Globe className="size-3" />
                  Công khai
                </>
              ) : (
                <>
                  <Lock className="size-3" />
                  Riêng tư
                </>
              )}
            </Badge>
          );
        },
      },
      {
        id: "owner",
        header: "Chủ sở hữu",
        width: 180,
        cell: ({ row }) => {
          const owner = row.owner;
          if (!owner) {
            return (
              <span className="text-xs text-muted-foreground italic">
                Chưa có
              </span>
            );
          }
          return (
            <div className="flex items-center gap-2 min-w-0">
              <Avatar size="sm" className="size-6 border border-border">
                {owner.avatar && (
                  <AvatarImage
                    src={owner.avatar}
                    alt={owner.fullName || owner.username}
                  />
                )}
                <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                  {getInitials(owner.fullName || owner.username)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0 truncate">
                <span className="text-xs font-medium text-foreground truncate">
                  {owner.fullName || owner.username}
                </span>
                {owner.email && (
                  <span className="text-[10px] text-muted-foreground truncate">
                    {owner.email}
                  </span>
                )}
              </div>
            </div>
          );
        },
      },
      {
        id: "members",
        header: "Thành viên",
        align: "center",
        width: 120,
        cell: ({ row }) => {
          const count = row.members?.length ?? 0;
          return (
            <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
              <Users className="size-3.5 text-muted-foreground/70" />
              <span>{count}</span>
            </div>
          );
        },
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
        width: 110,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="icon-xs"
              className="size-7 hover:bg-muted text-muted-foreground hover:text-foreground"
              onClick={() => handleNavigate(row)}
              title="Truy cập workspace"
            >
              <ExternalLink className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              className="size-7 hover:bg-muted text-muted-foreground hover:text-foreground"
              onClick={(e) => handleEditClick(e, row)}
              title="Chỉnh sửa workspace"
            >
              <Pencil className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              className="size-7 hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
              onClick={(e) => handleDeleteClick(e, row)}
              title="Xóa workspace"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [page, pageSize, starTogglingId, onEdit, onDelete, onSelect],
  );

  return (
    <div className={cn("space-y-4", className)}>
      <DataTable
        rowKey="id"
        columns={columns}
        data={items}
        isLoading={isLoading}
        onRowClick={(row) => handleNavigate(row)}
        emptyIcon={<Briefcase className="size-10 text-muted-foreground/40" />}
        emptyText="Chưa có không gian làm việc nào"
        emptyDescription="Hiện chưa có workspace nào được tạo hoặc không có kết quả phù hợp với bộ lọc."
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
        open={Boolean(workspaceToDelete)}
        onOpenChange={(open) => {
          if (!open) setWorkspaceToDelete(null);
        }}
        size="sm"
        variant="destructive"
        title="Xác nhận xóa Workspace"
        description={
          <>
            Bạn có chắc chắn muốn xóa không gian làm việc{" "}
            <strong className="text-foreground font-semibold">
              &ldquo;{workspaceToDelete?.name}&rdquo;
            </strong>{" "}
            không? Dữ liệu liên kết có thể sẽ bị ảnh hưởng.
          </>
        }
        cancelText="Hủy bỏ"
        confirmText={isDeleting ? "Đang xóa..." : "Xác nhận xóa"}
        confirmVariant="destructive"
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
      />

      {/* Modal cập nhật workspace (nếu dùng built-in edit modal) */}
      {!onEdit && (
        <WorkspaceDetailModal
          open={Boolean(workspaceToEdit)}
          onOpenChange={(open) => {
            if (!open) setWorkspaceToEdit(null);
          }}
          workspace={workspaceToEdit}
          onSuccess={() => {
            setWorkspaceToEdit(null);
          }}
        />
      )}
    </div>
  );
}

