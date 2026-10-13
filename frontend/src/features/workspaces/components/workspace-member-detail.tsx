"use client";

import * as React from "react";
import { Modal } from "@/components/common/modal";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import { useWorkspaceMember } from "../hooks";
import { useUserList } from "@/features/users/hooks";
import { useRoleList } from "@/features/roles/hooks";
import type {
  AddWorkspaceMemberDto,
  UpdateWorkspaceMemberDto,
  WorkspaceMemberItem,
} from "../types";
import {
  Check,
  CheckCircle2,
  Clock,
  Pencil,
  Shield,
  User,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface WorkspaceMemberDetailProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  workspaceId: number;
  workspaceName?: string;
  member?: WorkspaceMemberItem | null;
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}

interface FormState {
  userId?: number;
  roleId?: number;
  status: string;
}

const STATUS_OPTIONS = [
  {
    value: "active",
    label: "Hoạt động (Active)",
    icon: CheckCircle2,
    color: "text-emerald-500",
  },
  {
    value: "inactive",
    label: "Tạm ngưng (Inactive)",
    icon: XCircle,
    color: "text-slate-400",
  },
  {
    value: "pending",
    label: "Chờ xác nhận (Pending)",
    icon: Clock,
    color: "text-amber-500",
  },
];

function getInitials(name?: string | null): string {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function WorkspaceMemberDetailModal({
  open,
  onOpenChange,
  workspaceId,
  workspaceName,
  member,
  onSuccess,
  trigger,
}: WorkspaceMemberDetailProps) {
  const isEdit = Boolean(member);

  const { addMember, updateMember, isAdding, isUpdating } =
    useWorkspaceMember(workspaceId, member?.userId);

  const isSubmitting = isAdding || isUpdating;

  // Lấy danh sách Users để chọn khi thêm mới
  const { data: usersData, isLoading: isLoadingUsers } = useUserList({
    limit: 100,
  });

  // Lấy danh sách Roles để gán quyền
  const { data: rolesData, isLoading: isLoadingRoles } = useRoleList({
    limit: 100,
  });

  const availableUsers = React.useMemo(() => {
    if (!usersData) return [];
    if (Array.isArray(usersData)) return usersData;
    return usersData.items || [];
  }, [usersData]);

  const availableRoles = React.useMemo(() => {
    if (!rolesData) return [];
    if (Array.isArray(rolesData)) return rolesData;
    return rolesData.items || [];
  }, [rolesData]);

  const [form, setForm] = React.useState<FormState>({
    userId: undefined,
    roleId: undefined,
    status: "active",
  });
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [userSearch, setUserSearch] = React.useState("");

  // Đồng bộ form khi mở modal hoặc thay đổi member
  React.useEffect(() => {
    if (member) {
      setForm({
        userId: member.userId,
        roleId: member.roleId,
        status: member.status || "active",
      });
    } else {
      setForm({
        userId: undefined,
        roleId: undefined,
        status: "active",
      });
      setUserSearch("");
    }
    setErrors({});
  }, [member, open]);

  // Lọc users theo từ khóa tìm kiếm khi thêm mới
  const filteredUsers = React.useMemo(() => {
    if (!userSearch.trim()) return availableUsers;
    const term = userSearch.toLowerCase().trim();
    return availableUsers.filter(
      (u) =>
        u.fullName?.toLowerCase().includes(term) ||
        u.username?.toLowerCase().includes(term) ||
        u.email?.toLowerCase().includes(term),
    );
  }, [availableUsers, userSearch]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!isEdit && !form.userId) {
      newErrors.userId = "Vui lòng chọn người dùng cần thêm vào workspace.";
    }

    if (!form.roleId) {
      newErrors.roleId = "Vui lòng chọn vai trò cho thành viên.";
    }

    if (!form.status) {
      newErrors.status = "Vui lòng chọn trạng thái.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!validate() || isSubmitting) return;

    try {
      if (isEdit && member) {
        const dto: UpdateWorkspaceMemberDto = {
          roleId: form.roleId,
          status: form.status,
        };

        await updateMember({
          workspaceId,
          userId: member.userId,
          dto,
        });

        toast.add({
          title: "Cập nhật thành công",
          description: `Thông tin thành viên "${member.user?.fullName || member.user?.username}" đã được cập nhật.`,
          type: "success",
        });

        onSuccess?.();
        onOpenChange?.(false);
      } else if (form.userId && form.roleId) {
        const dto: AddWorkspaceMemberDto = {
          userId: form.userId,
          roleId: form.roleId,
          status: form.status,
        };

        await addMember({
          workspaceId,
          dto,
        });

        toast.add({
          title: "Thêm thành viên thành công",
          description: "Thành viên mới đã được thêm vào workspace.",
          type: "success",
        });

        onSuccess?.();
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
        : apiMessage || "Có lỗi xảy ra khi lưu thông tin thành viên. Vui lòng thử lại!";

      toast.add({
        title: isEdit ? "Cập nhật thất bại" : "Thêm thành viên thất bại",
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
      size="lg"
      title={isEdit ? "Cập nhật thành viên" : "Thêm thành viên vào Workspace"}
      description={
        isEdit
          ? `Điều chỉnh vai trò và trạng thái hoạt động của thành viên trong workspace ${workspaceName ? `"${workspaceName}"` : ""}.`
          : `Gán người dùng vào workspace ${workspaceName ? `"${workspaceName}"` : ""} và thiết lập vai trò.`
      }
      icon={
        isEdit ? (
          <Pencil className="size-5 text-primary" />
        ) : (
          <UserPlus className="size-5 text-primary" />
        )
      }
      cancelText="Hủy bỏ"
      confirmText={isEdit ? "Lưu thay đổi" : "Thêm thành viên"}
      isLoading={isSubmitting}
      onConfirm={handleSubmit}
    >
      <form className="space-y-5 py-1" onSubmit={(e) => e.preventDefault()}>
        {/* Phần 1: Chọn hoặc hiển thị User */}
        {isEdit && member ? (
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Thành viên</Label>
            <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/30">
              <Avatar size="sm" className="size-10 border border-border">
                {member.user?.avatar && (
                  <AvatarImage
                    src={member.user.avatar}
                    alt={member.user.fullName || member.user.username}
                  />
                )}
                <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                  {getInitials(member.user?.fullName || member.user?.username)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-semibold text-foreground truncate">
                  {member.user?.fullName || member.user?.username}
                </span>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>@{member.user?.username}</span>
                  {member.user?.email && (
                    <>
                      <span>•</span>
                      <span className="truncate">{member.user.email}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <Label className="text-xs font-semibold">
              Chọn người dùng <span className="text-destructive">*</span>
            </Label>

            {/* Input lọc nhanh user */}
            <input
              type="text"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Tìm kiếm người dùng theo tên, username hoặc email..."
              className="w-full rounded-md border border-input bg-transparent px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
            />

            {isLoadingUsers ? (
              <div className="p-4 text-center text-xs text-muted-foreground">
                Đang tải danh sách người dùng...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground italic rounded-lg border border-dashed">
                Không tìm thấy người dùng phù hợp.
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-1.5 p-1 rounded-lg border border-border/70 bg-card">
                {filteredUsers.map((user) => {
                  const isSelected = form.userId === user.id;
                  return (
                    <div
                      key={user.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        setForm((prev) => ({ ...prev, userId: user.id }));
                        if (errors.userId) {
                          setErrors((prev) => {
                            const next = { ...prev };
                            delete next.userId;
                            return next;
                          });
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          setForm((prev) => ({ ...prev, userId: user.id }));
                        }
                      }}
                      className={cn(
                        "flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors text-xs select-none",
                        isSelected
                          ? "bg-primary/10 border border-primary/30 text-foreground"
                          : "hover:bg-muted/60 text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar size="sm" className="size-7 border border-border">
                          {user.avatar && (
                            <AvatarImage
                              src={user.avatar}
                              alt={user.fullName || user.username}
                            />
                          )}
                          <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                            {getInitials(user.fullName || user.username)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-foreground truncate">
                            {user.fullName || user.username}
                          </span>
                          <span className="text-[10px] text-muted-foreground truncate">
                            @{user.username} {user.email ? `• ${user.email}` : ""}
                          </span>
                        </div>
                      </div>
                      {isSelected && (
                        <Check className="size-4 text-primary shrink-0 mr-1" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {errors.userId && (
              <p className="text-[11px] text-destructive">{errors.userId}</p>
            )}
          </div>
        )}

        {/* Phần 2: Chọn Vai trò (Role) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold">
              Vai trò trong Workspace <span className="text-destructive">*</span>
            </Label>
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Shield className="size-3 text-primary" /> Phân quyền truy cập
            </span>
          </div>

          {isLoadingRoles ? (
            <div className="p-3 text-center text-xs text-muted-foreground">
              Đang tải danh sách vai trò...
            </div>
          ) : availableRoles.length === 0 ? (
            <div className="p-3 text-center text-xs text-muted-foreground italic rounded-lg border">
              Chưa có vai trò nào trong hệ thống.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {availableRoles.map((role) => {
                const isSelected = form.roleId === role.id;
                return (
                  <div
                    key={role.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      setForm((prev) => ({ ...prev, roleId: role.id }));
                      if (errors.roleId) {
                        setErrors((prev) => {
                          const next = { ...prev };
                          delete next.roleId;
                          return next;
                        });
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        setForm((prev) => ({ ...prev, roleId: role.id }));
                      }
                    }}
                    className={cn(
                      "flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-all text-xs select-none",
                      isSelected
                        ? "border-primary bg-primary/10 shadow-xs ring-1 ring-primary/30"
                        : "border-border hover:bg-muted/40",
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={cn(
                          "size-7 rounded-md flex items-center justify-center shrink-0",
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        <Shield className="size-3.5" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-foreground truncate">
                          {role.name}
                        </span>
                        {role.description && (
                          <span className="text-[10px] text-muted-foreground truncate">
                            {role.description}
                          </span>
                        )}
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="size-4 text-primary shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {errors.roleId && (
            <p className="text-[11px] text-destructive">{errors.roleId}</p>
          )}
        </div>

        {/* Phần 3: Trạng thái (Status) */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold">
            Trạng thái hoạt động <span className="text-destructive">*</span>
          </Label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {STATUS_OPTIONS.map((item) => {
              const Icon = item.icon;
              const isSelected = form.status === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() =>
                    setForm((prev) => ({ ...prev, status: item.value }))
                  }
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-lg border text-xs font-medium transition-all select-none text-left",
                    isSelected
                      ? "border-primary bg-primary/10 ring-1 ring-primary/20 text-foreground"
                      : "border-border hover:bg-muted/40 text-muted-foreground",
                  )}
                >
                  <Icon className={cn("size-3.5 shrink-0", item.color)} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
          {errors.status && (
            <p className="text-[11px] text-destructive">{errors.status}</p>
          )}
        </div>
      </form>
    </Modal>
  );
}

// Alias export
export const WorkspaceMemberDetail = WorkspaceMemberDetailModal;

