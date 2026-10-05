"use client";

import * as React from "react";
import { DataTable, type ColumnDef } from "@/components/common/data-table";
import { Modal } from "@/components/common/modal";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "@/components/ui/toast";
import { useUser, useUserList } from "../hooks";
import type { UserItem, UserQueryParams } from "../types";
import {
  Pencil,
  Trash2,
  Calendar,
  Mail,
  Phone,
  Shield,
  User as UserIcon,
} from "lucide-react";

export interface UserTableProps {
  data?: UserItem[];
  total?: number;
  isLoading?: boolean;
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  onEdit?: (user: UserItem) => void;
  onDelete?: (user: UserItem) => void;
  queryParams?: UserQueryParams;
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

function getDobDetails(dobStr?: string | null) {
  if (!dobStr) return null;
  const birthDate = new Date(dobStr);
  if (isNaN(birthDate.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  if (age < 0) age = 0;

  const day = String(birthDate.getDate()).padStart(2, "0");
  const month = String(birthDate.getMonth() + 1).padStart(2, "0");
  const year = birthDate.getFullYear();
  const formattedDob = `${day}/${month}/${year}`;

  return {
    age,
    formattedDob,
  };
}

function getInitials(name?: string | null): string {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function UserTable({
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
}: UserTableProps) {
  const [internalPage, setInternalPage] = React.useState(1);
  const [internalPageSize, setInternalPageSize] = React.useState(10);

  const isControlled = externalData !== undefined;
  const page = externalPage ?? internalPage;
  const pageSize = externalPageSize ?? internalPageSize;

  const { data: queryData, isLoading: isQueryLoading } = useUserList(
    isControlled
      ? undefined
      : {
          page,
          limit: pageSize,
          ...queryParams,
        },
  );

  const { deleteUser, isDeleting } = useUser();

  const [userToDelete, setUserToDelete] = React.useState<UserItem | null>(null);

  const items: UserItem[] = React.useMemo(() => {
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
    if (!userToDelete) return;
    try {
      if (onDelete) {
        onDelete(userToDelete);
      } else {
        await deleteUser(userToDelete.id);
        toast.add({
          title: "Xóa thành công",
          description: `Người dùng "${userToDelete.fullName}" đã được xóa khỏi hệ thống.`,
          type: "success",
        });
      }
      setUserToDelete(null);
    } catch (err: unknown) {
      const error = err as { message?: string };
      console.error("Lỗi khi xóa người dùng:", err);
      toast.add({
        title: "Xóa thất bại",
        description:
          error?.message ||
          "Có lỗi xảy ra khi xóa người dùng. Vui lòng thử lại!",
        type: "error",
      });
    }
  };

  const columns = React.useMemo<ColumnDef<UserItem>[]>(
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
        header: "Người dùng",
        accessorKey: "fullName",
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <Avatar size="default" className="border border-border">
              {row.avatar && (
                <AvatarImage
                  src={row.avatar}
                  alt={row.fullName || row.username}
                  className="object-cover"
                />
              )}
              <AvatarFallback className="font-semibold text-xs bg-primary/10 text-primary">
                {getInitials(row.fullName || row.username)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-foreground text-sm truncate">
                {row.fullName}
              </span>
              <span className="text-xs text-muted-foreground font-mono">
                @{row.username}
              </span>
            </div>
          </div>
        ),
      },
      {
        id: "dob",
        header: "Ngày sinh",
        accessorKey: "dob",
        align: "center",
        width: 150,
        cell: ({ row }) => {
          const dobInfo = getDobDetails(row.dob);
          if (!dobInfo) {
            return <span className="text-xs text-muted-foreground">—</span>;
          }
          return (
            <div className="flex items-center justify-center gap-1.5">
              <span className="inline-flex items-center justify-center min-w-[24px] px-1.5 py-0.5 rounded text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20">
                {dobInfo.age}
              </span>
              <span className="text-xs text-muted-foreground font-medium">
                {dobInfo.formattedDob}
              </span>
            </div>
          );
        },
      },
      {
        id: "contact",
        header: "Liên hệ",
        cell: ({ row }) => (
          <div className="flex flex-col gap-1 text-xs text-muted-foreground">
            {row.email && (
              <div className="flex items-center gap-1.5 truncate">
                <Mail className="size-3 text-muted-foreground/70 shrink-0" />
                <span className="truncate">{row.email}</span>
              </div>
            )}
            {row.phone && (
              <div className="flex items-center gap-1.5 truncate">
                <Phone className="size-3 text-muted-foreground/70 shrink-0" />
                <span>{row.phone}</span>
              </div>
            )}
            {!row.email && !row.phone && <span>—</span>}
          </div>
        ),
      },
      {
        id: "gender",
        header: "Giới tính",
        accessorKey: "gender",
        align: "center",
        width: 100,
        cell: ({ row }) => {
          const gender = row.gender?.toLowerCase();
          const badgeClass =
            gender === "nam"
              ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
              : gender === "nữ" || gender === "nu"
                ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                : "bg-muted text-muted-foreground border-border";
          return row.gender ? (
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-sm text-[11px] font-medium border ${badgeClass}`}
            >
              {row.gender}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          );
        },
      },
      {
        id: "roles",
        header: "Vai trò",
        cell: ({ row }) => {
          const userRoles = row.userRoles || [];
          if (!userRoles.length) {
            return (
              <span className="text-xs text-muted-foreground/60 italic">
                Chưa gán vai trò
              </span>
            );
          }
          return (
            <div className="flex flex-wrap gap-1.5 max-w-xs">
              {userRoles.map((ur, urIndex) => (
                <span
                  key={ur.id ?? ur.roleId ?? `ur-${urIndex}`}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-primary/10 text-primary border border-primary/20"
                >
                  <Shield className="size-2.5 shrink-0" />
                  {ur.role?.name || `Role #${ur.roleId}`}
                </span>
              ))}
            </div>
          );
        },
      },
      {
        id: "createdAt",
        header: "Ngày tạo",
        accessorKey: "createdAt",
        width: 160,
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
        width: 90,
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
                title="Chỉnh sửa người dùng"
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
                setUserToDelete(row);
              }}
              title="Xóa người dùng"
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
        rowKey="id"
        columns={columns}
        data={items}
        isLoading={isLoading}
        emptyIcon={<UserIcon className="size-10 text-muted-foreground/40" />}
        emptyText="Chưa có người dùng nào"
        emptyDescription="Hiện chưa có người dùng nào trong hệ thống hoặc không có kết quả phù hợp với bộ lọc."
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
        open={Boolean(userToDelete)}
        onOpenChange={(open) => {
          if (!open) setUserToDelete(null);
        }}
        size="sm"
        variant="destructive"
        title="Xác nhận xóa người dùng"
        description={
          <>
            Bạn có chắc chắn muốn xóa tài khoản của{" "}
            <strong className="text-foreground font-semibold">
              &ldquo;{userToDelete?.fullName || userToDelete?.username}&rdquo;
            </strong>{" "}
            không? Hành động này sẽ chuyển trạng thái người dùng sang đã xóa.
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
