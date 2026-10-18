"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/common/modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { useAuthStore } from "@/stores/auth-store";
import { useWorkspace, useWorkspaceList } from "../hooks";
import type { WorkspaceItem, WorkspaceQueryParams } from "../types";
import { WorkspaceDetailModal } from "./workspace-detail";
import {
  ArrowRight,
  Briefcase,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Globe,
  Lock,
  Pencil,
  Star,
  Trash2,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface WorkspaceCardsProps {
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
  showPagination?: boolean;
  emptyAction?: React.ReactNode;
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

export function WorkspaceCards({
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
  showPagination = true,
  emptyAction,
  className,
}: WorkspaceCardsProps) {
  const router = useRouter();
  const permissions = useAuthStore((s) => s.permissions);

  const canUpdate = React.useMemo(
    () => permissions.some((p) => p.code === "WORKSPACE_UPDATE"),
    [permissions],
  );

  const canDelete = React.useMemo(
    () => permissions.some((p) => p.code === "WORKSPACE_DELETE"),
    [permissions],
  );

  // Quản lý pagination nội bộ khi component không nhận props từ ngoài
  const [internalPage, setInternalPage] = React.useState(1);
  const [internalPageSize, setInternalPageSize] = React.useState(8);

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

  // State quản lý Modal xóa, Modal sửa và toggle Star
  const [workspaceToDelete, setWorkspaceToDelete] =
    React.useState<WorkspaceItem | null>(null);
  const [workspaceToEdit, setWorkspaceToEdit] =
    React.useState<WorkspaceItem | null>(null);
  const [starTogglingId, setStarTogglingId] = React.useState<number | null>(
    null,
  );

  // Chuẩn hóa danh sách workspaces
  const items: WorkspaceItem[] = React.useMemo(() => {
    if (externalData) return externalData;
    if (!queryData) return [];
    if (Array.isArray(queryData)) return queryData;
    return queryData.items || [];
  }, [externalData, queryData]);

  // Tổng số bản ghi phục vụ phân trang
  const total: number = React.useMemo(() => {
    if (typeof externalTotal === "number") return externalTotal;
    if (!queryData) return 0;
    if (Array.isArray(queryData)) return queryData.length;
    return queryData.meta?.itemCount ?? 0;
  }, [externalTotal, queryData]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const isLoading =
    externalIsLoading ?? (isControlled ? false : isQueryLoading);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
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

  // Bật/tắt trạng thái yêu thích
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

  // Mở modal sửa
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

  // Mở modal xóa
  const handleDeleteClick = (
    e: React.MouseEvent,
    workspace: WorkspaceItem,
  ) => {
    e.stopPropagation();
    setWorkspaceToDelete(workspace);
  };

  // Xác nhận xóa
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

  return (
    <div className={cn("space-y-6", className)}>
      {/* Loading Skeleton Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: pageSize || 8 }).map((_, idx) => (
            <Card key={`ws-skeleton-${idx}`} className="p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-10 rounded-lg shrink-0" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
                <Skeleton className="size-6 rounded-full shrink-0" />
              </div>
              <Skeleton className="h-10 w-full" />
              <div className="flex items-center justify-between pt-2 border-t border-border/40">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
            </Card>
          ))}
        </div>
      ) : items.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center p-12 text-center border rounded-xl border-dashed bg-card/50">
          <div className="size-12 rounded-full bg-muted flex items-center justify-center mb-3">
            <Briefcase className="size-6 text-muted-foreground/60" />
          </div>
          <h3 className="text-base font-semibold text-foreground">
            Chưa có không gian làm việc nào
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm mt-1 mb-4">
            Không tìm thấy workspace nào. Bạn có thể bắt đầu bằng cách tạo một không gian làm việc mới.
          </p>
          {emptyAction}
        </div>
      ) : (
        /* Workspaces Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map((workspace) => {
            const modeLabel =
              workspace.modeName || workspace.modeData?.name || workspace.mode;
            const isPublic =
              workspace.mode === "public" ||
              workspace.mode === "WSM002" ||
              (modeLabel
                ? modeLabel.toLowerCase().includes("public") ||
                  modeLabel.toLowerCase().includes("công khai")
                : false);
            const memberCount = workspace.members?.length ?? 0;

            return (
              <Card
                key={workspace.id}
                onClick={() => handleNavigate(workspace)}
                className="group relative flex flex-col justify-between border border-border/60 hover:border-primary/40 hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden p-5"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="size-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 text-primary font-bold text-sm group-hover:scale-105 transition-transform">
                        {getInitials(workspace.name)}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4
                            className="font-semibold text-foreground text-sm truncate group-hover:text-primary transition-colors"
                            title={workspace.name}
                          >
                            {workspace.name}
                          </h4>
                        </div>
                        <span className="text-[11px] text-muted-foreground font-mono truncate">
                          /workspaces/{workspace.slug || workspace.id}
                        </span>
                      </div>
                    </div>

                    {/* Star Button */}
                    <button
                      type="button"
                      onClick={(e) => handleToggleStar(e, workspace)}
                      disabled={starTogglingId === workspace.id}
                      className="inline-flex items-center justify-center p-1 rounded-md text-muted-foreground/60 hover:text-amber-500 hover:bg-muted/80 transition-all shrink-0"
                      title={
                        workspace.isStar
                          ? "Bỏ yêu thích"
                          : "Đánh dấu yêu thích"
                      }
                    >
                      <Star
                        className={cn(
                          "size-4 transition-colors",
                          workspace.isStar
                            ? "fill-amber-400 text-amber-500"
                            : "hover:fill-amber-200/40",
                        )}
                      />
                    </button>
                  </div>

                  {/* Mode Badge & Description */}
                  <div className="mt-3.5 space-y-2.5">
                    <div className="flex items-center gap-2">
                      {modeLabel && (
                        <Badge
                          variant={isPublic ? "secondary" : "outline"}
                          className={cn(
                            "inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full",
                            isPublic
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              : "bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20",
                          )}
                        >
                          {isPublic ? (
                            <Globe className="size-2.5" />
                          ) : (
                            <Lock className="size-2.5" />
                          )}
                          {modeLabel}
                        </Badge>
                      )}

                      {typeof workspace.displayOrder === "number" && (
                        <span className="text-[10px] text-muted-foreground font-mono">
                          #{workspace.displayOrder}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-2 min-h-[32px] leading-relaxed">
                      {workspace.description || (
                        <span className="italic text-muted-foreground/50">
                          Chưa có mô tả cho workspace này
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Card Meta & Actions */}
                <div className="mt-4 pt-3.5 border-t border-border/50 flex flex-col gap-3">
                  {/* Owner & Members Info */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    {/* Owner Info */}
                    <div className="flex items-center gap-1.5 min-w-0">
                      {workspace.owner ? (
                        <>
                          <Avatar size="sm" className="size-5 border border-border">
                            {workspace.owner.avatar && (
                              <AvatarImage
                                src={workspace.owner.avatar}
                                alt={
                                  workspace.owner.fullName ||
                                  workspace.owner.username
                                }
                              />
                            )}
                            <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                              {getInitials(
                                workspace.owner.fullName ||
                                  workspace.owner.username,
                              )}
                            </AvatarFallback>
                          </Avatar>
                          <span className="truncate max-w-[100px] text-[11px] font-medium text-foreground">
                            {workspace.owner.fullName ||
                              workspace.owner.username}
                          </span>
                        </>
                      ) : (
                        <div className="flex items-center gap-1 text-[11px]">
                          <Calendar className="size-3 text-muted-foreground/70" />
                          <span>{formatDate(workspace.createdAt)}</span>
                        </div>
                      )}
                    </div>

                    {/* Member Count */}
                    <div className="inline-flex items-center gap-1 text-[11px] text-muted-foreground font-medium shrink-0">
                      <Users className="size-3 text-muted-foreground/70" />
                      <span>{memberCount} thành viên</span>
                    </div>
                  </div>

                  {/* Card Bottom Actions */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary group-hover:translate-x-0.5 transition-transform">
                      Truy cập
                      <ArrowRight className="size-3" />
                    </span>

                    {(canUpdate || canDelete) && (
                      <div className="flex items-center gap-0.5">
                        {canUpdate && (
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            className="size-7 hover:bg-muted text-muted-foreground hover:text-foreground"
                            onClick={(e) => handleEditClick(e, workspace)}
                            title="Chỉnh sửa workspace"
                          >
                            <Pencil className="size-3" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            className="size-7 hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                            onClick={(e) => handleDeleteClick(e, workspace)}
                            title="Xóa workspace"
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination Bar */}
      {showPagination && total > 0 && !isLoading && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-3 flex-wrap">
            <span>
              Hiển thị{" "}
              <span className="font-medium text-foreground">
                {Math.min((page - 1) * pageSize + 1, total)}
              </span>{" "}
              -{" "}
              <span className="font-medium text-foreground">
                {Math.min(page * pageSize, total)}
              </span>{" "}
              trên tổng số{" "}
              <span className="font-medium text-foreground">{total}</span> workspace
            </span>

            <div className="flex items-center gap-1.5 pl-2 border-l border-border/60">
              <span className="text-[11px] text-muted-foreground">Mỗi trang:</span>
              <select
                aria-label="Số workspace mỗi trang"
                value={pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                className="h-7 rounded border border-input bg-background px-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {[4, 8, 12, 16, 24].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => handlePageChange(page - 1)}
              className="h-8 px-2.5 text-xs"
            >
              <ChevronLeft className="size-3.5 mr-1" />
              Trước
            </Button>
            <div className="px-2 text-xs font-medium">
              Trang {page} / {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => handlePageChange(page + 1)}
              className="h-8 px-2.5 text-xs"
            >
              Sau
              <ChevronRight className="size-3.5 ml-1" />
            </Button>
          </div>
        </div>
      )}

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

      {/* Modal chỉnh sửa workspace */}
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
