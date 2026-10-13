"use client";

import * as React from "react";
import { DataTable, type ColumnDef } from "@/components/common/data-table";
import { Modal } from "@/components/common/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import {
  useWorkspaceMember,
  useWorkspaceMemberList,
  WORKSPACE_MEMBER_QUERY_KEYS,
} from "../hooks";
import type { WorkspaceMemberItem, WorkspaceMemberQueryParams } from "../types";
import { WorkspaceMemberDetailModal } from "./workspace-member-detail";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Trash2,
  UserCheck,
  Users,
  XCircle,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

export interface WorkspaceMemberProps {
  workspaceId: number;
  workspaceName?: string;
  canManage?: boolean;
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
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function WorkspaceMember({
  workspaceId,
  workspaceName,
  canManage = true,
  className,
}: WorkspaceMemberProps) {
  const queryClient = useQueryClient();

  // Pagination states
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  // Search & filter states
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  // Modal states
  const [modalOpen, setModalOpen] = React.useState(false);
  const [selectedMember, setSelectedMember] =
    React.useState<WorkspaceMemberItem | null>(null);
  const [memberToDelete, setMemberToDelete] =
    React.useState<WorkspaceMemberItem | null>(null);

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Query parameters
  const queryParams = React.useMemo<WorkspaceMemberQueryParams>(() => {
    return {
      page,
      limit: pageSize,
      search: debouncedSearch || undefined,
      status: statusFilter === "all" ? undefined : statusFilter,
    };
  }, [page, pageSize, debouncedSearch, statusFilter]);

  // Query danh sách thành viên
  const { data: memberData, isLoading, refetch } = useWorkspaceMemberList(
    workspaceId,
    queryParams,
  );

  const { removeMember, isRemoving } = useWorkspaceMember(workspaceId);

  // Chuẩn hóa danh sách thành viên từ API response
  const members: WorkspaceMemberItem[] = React.useMemo(() => {
    if (!memberData) return [];
    if (Array.isArray(memberData)) return memberData;
    return memberData.items || [];
  }, [memberData]);

  // Tổng số thành viên phục vụ phân trang
  const total: number | undefined = React.useMemo(() => {
    if (!memberData) return undefined;
    if (Array.isArray(memberData)) return memberData.length;
    return memberData.meta?.itemCount;
  }, [memberData]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({
      queryKey: WORKSPACE_MEMBER_QUERY_KEYS.workspace(workspaceId),
    });
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleAddMember = () => {
    setSelectedMember(null);
    setModalOpen(true);
  };

  const handleEditMember = (member: WorkspaceMemberItem) => {
    setSelectedMember(member);
    setModalOpen(true);
  };

  const handleDeleteMember = (member: WorkspaceMemberItem) => {
    setMemberToDelete(member);
  };

  const handleConfirmDelete = async () => {
    if (!memberToDelete) return;
    try {
      await removeMember({
        workspaceId,
        userId: memberToDelete.userId,
      });

      toast.add({
        title: "Đã xóa thành viên",
        description: `Đã xóa "${memberToDelete.user?.fullName || memberToDelete.user?.username}" khỏi workspace.`,
        type: "success",
      });

      setMemberToDelete(null);
    } catch (err: unknown) {
      const error = err as { message?: string };
      toast.add({
        title: "Xóa thành viên thất bại",
        description:
          error?.message || "Không thể xóa thành viên. Vui lòng thử lại!",
        type: "error",
      });
    }
  };

  // Cấu hình các cột hiển thị trong DataTable
  const columns = React.useMemo<ColumnDef<WorkspaceMemberItem>[]>(
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
        id: "user",
        header: "Thành viên",
        accessorKey: "userId",
        cell: ({ row }) => {
          const user = row.user;
          const displayName = user?.fullName || user?.username || `User #${row.userId}`;
          return (
            <div className="flex items-center gap-3">
              <Avatar size="sm" className="size-9 border border-border">
                {user?.avatar && (
                  <AvatarImage src={user.avatar} alt={displayName} />
                )}
                <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                  {getInitials(displayName)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0">
                <span className="font-semibold text-foreground text-sm truncate max-w-[220px]">
                  {displayName}
                </span>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate max-w-[240px]">
                  {user?.username && <span>@{user.username}</span>}
                  {user?.email && (
                    <>
                      <span>•</span>
                      <span className="truncate">{user.email}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        },
      },
      {
        id: "role",
        header: "Vai trò",
        align: "center",
        width: 140,
        cell: ({ row }) => {
          const roleName = row.role?.name || "Thành viên";
          const isOwner = roleName.toLowerCase().includes("owner") || roleName.toLowerCase().includes("chủ");
          const isAdmin = roleName.toLowerCase().includes("admin");

          return (
            <Badge
              variant="outline"
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium rounded-full",
                isOwner
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                  : isAdmin
                    ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                    : "bg-muted/70 text-foreground border-border",
              )}
            >
              <Shield className="size-3" />
              <span>{roleName}</span>
            </Badge>
          );
        },
      },
      {
        id: "status",
        header: "Trạng thái",
        align: "center",
        width: 130,
        cell: ({ row }) => {
          const status = row.status?.toLowerCase() || "active";
          if (status === "active") {
            return (
              <Badge
                variant="outline"
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
              >
                <CheckCircle2 className="size-3" />
                Hoạt động
              </Badge>
            );
          }
          if (status === "pending") {
            return (
              <Badge
                variant="outline"
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
              >
                <Clock className="size-3" />
                Chờ duyệt
              </Badge>
            );
          }
          return (
            <Badge
              variant="outline"
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium rounded-full bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20"
            >
              <XCircle className="size-3" />
              Tạm ngưng
            </Badge>
          );
        },
      },
      {
        id: "joinedAt",
        header: "Ngày tham gia",
        width: 150,
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="size-3.5 text-muted-foreground/70 shrink-0" />
            <span className="truncate">{formatDate(row.joinedAt || row.createdAt)}</span>
          </div>
        ),
      },
      {
        id: "actions",
        header: "Thao tác",
        align: "right",
        width: 100,
        cell: ({ row }) => {
          if (!canManage) return null;
          return (
            <div className="flex items-center justify-end gap-1">
              <Button
                variant="ghost"
                size="icon-xs"
                className="size-7 hover:bg-muted text-muted-foreground hover:text-foreground"
                onClick={() => handleEditMember(row)}
                title="Thay đổi vai trò / trạng thái"
              >
                <Pencil className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                className="size-7 hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                onClick={() => handleDeleteMember(row)}
                title="Xóa khỏi workspace"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [page, pageSize, canManage],
  );

  return (
    <div className={cn("space-y-4 w-full", className)}>
      {/* Thanh công cụ tìm kiếm, bộ lọc & thao tác */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Tìm kiếm & filter trạng thái */}
        <div className="flex items-center gap-2.5 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm thành viên theo tên, email..."
              className="pl-8 text-xs h-9"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Lọc theo trạng thái"
            className="h-9 rounded-md border border-input bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary shrink-0"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Hoạt động (Active)</option>
            <option value="pending">Chờ xác nhận (Pending)</option>
            <option value="inactive">Tạm ngưng (Inactive)</option>
          </select>
        </div>

        {/* Nút hành động */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="gap-1.5 text-xs font-medium"
          >
            <RefreshCw
              className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`}
            />
            Làm mới
          </Button>

          {canManage && (
            <Button
              size="sm"
              onClick={handleAddMember}
              className="gap-1.5 text-xs font-medium"
            >
              <Plus className="size-3.5" />
              Thêm thành viên
            </Button>
          )}
        </div>
      </div>

      {/* Bảng dữ liệu thành viên */}
      <DataTable
        rowKey="id"
        columns={columns}
        data={members}
        isLoading={isLoading}
        emptyIcon={<Users className="size-10 text-muted-foreground/40" />}
        emptyText="Chưa có thành viên nào"
        emptyDescription="Workspace chưa có thành viên nào khác hoặc không tìm thấy kết quả phù hợp với bộ lọc."
        pagination={{
          page,
          pageSize,
          total,
          onPageChange: (newPage) => setPage(newPage),
          onPageSizeChange: (newPageSize) => {
            setPageSize(newPageSize);
            setPage(1);
          },
          disabled: isLoading,
        }}
      />

      {/* Modal Thêm & Cập nhật thành viên */}
      <WorkspaceMemberDetailModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        workspaceId={workspaceId}
        workspaceName={workspaceName}
        member={selectedMember}
        onSuccess={() => {
          refetch();
        }}
      />

      {/* Modal xác nhận xóa thành viên */}
      <Modal
        open={Boolean(memberToDelete)}
        onOpenChange={(open) => {
          if (!open) setMemberToDelete(null);
        }}
        size="sm"
        variant="destructive"
        title="Xác nhận xóa thành viên"
        description={
          <>
            Bạn có chắc chắn muốn xóa thành viên{" "}
            <strong className="text-foreground font-semibold">
              &ldquo;
              {memberToDelete?.user?.fullName ||
                memberToDelete?.user?.username ||
                `#${memberToDelete?.userId}`}
              &rdquo;
            </strong>{" "}
            khỏi không gian làm việc này không?
          </>
        }
        cancelText="Hủy bỏ"
        confirmText={isRemoving ? "Đang xóa..." : "Xác nhận xóa"}
        confirmVariant="destructive"
        onConfirm={handleConfirmDelete}
        isLoading={isRemoving}
      />
    </div>
  );
}

export const WorkspaceMemberTable = WorkspaceMember;
