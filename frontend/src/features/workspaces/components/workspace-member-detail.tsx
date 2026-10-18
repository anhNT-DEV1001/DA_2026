"use client";

import * as React from "react";
import { Modal } from "@/components/common/modal";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import { useWorkspaceMember } from "../hooks";
import { useUserSearch } from "@/features/users/hooks";
import { RolePicker } from "@/features/roles";
import { MasterDataPicker } from "@/features/masterdata";
import type { UserItem } from "@/features/users/types";
import type {
  AddWorkspaceMemberDto,
  UpdateWorkspaceMemberDto,
  WorkspaceMemberItem,
} from "../types";
import {
  Loader2,
  Pencil,
  Search,
  Shield,
  UserPlus,
  Users,
  X,
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
  roleId?: number | null;
  status: string;
}

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

  const { addMember, updateMember, isAdding, isUpdating } = useWorkspaceMember(
    workspaceId,
    member?.userId,
  );

  const isSubmitting = isAdding || isUpdating;

  const [form, setForm] = React.useState<FormState>({
    userId: undefined,
    roleId: null,
    status: "MS001",
  });
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  // State tìm kiếm người dùng với dropdown autocomplete
  const [userSearch, setUserSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const [selectedUser, setSelectedUser] = React.useState<UserItem | null>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Debounce từ khóa tìm kiếm (300ms)
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(userSearch.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [userSearch]);

  // Call API tìm kiếm người dùng khi có từ khóa
  const {
    data: searchResults = [],
    isLoading: isSearchingUsers,
    isFetching: isFetchingUsers,
  } = useUserSearch(debouncedSearch);

  const isSearching =
    (userSearch.trim().length > 0 && userSearch.trim() !== debouncedSearch) ||
    isSearchingUsers ||
    isFetchingUsers;

  // Đóng dropdown khi click ra ngoài
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Đồng bộ form khi mở modal hoặc thay đổi member
  React.useEffect(() => {
    if (member) {
      let currentStatus = member.status || "MS001";
      if (currentStatus === "active") currentStatus = "MS001";
      if (currentStatus === "pending") currentStatus = "MS002";
      setForm({
        userId: member.userId,
        roleId: member.roleId ?? null,
        status: currentStatus,
      });
      setSelectedUser(null);
    } else {
      setForm({
        userId: undefined,
        roleId: null,
        status: "MS001",
      });
      setUserSearch("");
      setDebouncedSearch("");
      setSelectedUser(null);
      setIsDropdownOpen(false);
    }
    setErrors({});
  }, [member, open]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!isEdit && !form.userId) {
      newErrors.userId = "Vui lòng chọn người dùng cần thêm vào workspace.";
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
          roleId: form.roleId !== undefined ? form.roleId : null,
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
      } else if (form.userId) {
        const dto: AddWorkspaceMemberDto = {
          userId: form.userId,
          roleId: form.roleId ?? null,
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
        : apiMessage ||
          "Có lỗi xảy ra khi lưu thông tin thành viên. Vui lòng thử lại!";

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

            {/* Thẻ hiển thị người dùng đã chọn */}
            {selectedUser ? (
              <div className="flex items-center justify-between p-3 rounded-xl border border-primary/40 bg-primary/5">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar size="sm" className="size-10 border border-border">
                    {selectedUser.avatar && (
                      <AvatarImage
                        src={selectedUser.avatar}
                        alt={selectedUser.fullName || selectedUser.username}
                      />
                    )}
                    <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                      {getInitials(
                        selectedUser.fullName || selectedUser.username,
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-semibold text-foreground truncate">
                      {selectedUser.fullName || selectedUser.username}
                    </span>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>@{selectedUser.username}</span>
                      {selectedUser.email && (
                        <>
                          <span>•</span>
                          <span className="truncate">{selectedUser.email}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setSelectedUser(null);
                    setForm((prev) => ({ ...prev, userId: undefined }));
                    setUserSearch("");
                    setDebouncedSearch("");
                    setIsDropdownOpen(false);
                  }}
                >
                  <X className="size-3.5 mr-1" /> Thay đổi
                </Button>
              </div>
            ) : (
              /* Ô input tìm kiếm người dùng với Dropdown Autocomplete */
              <div ref={dropdownRef} className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => {
                      setUserSearch(e.target.value);
                      setIsDropdownOpen(true);
                    }}
                    onFocus={() => {
                      if (userSearch.trim()) {
                        setIsDropdownOpen(true);
                      }
                    }}
                    placeholder="Nhập tên hoặc email để tìm kiếm người dùng..."
                    className="w-full rounded-lg border border-input bg-transparent pl-9 pr-9 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  {isSearching ? (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-primary animate-spin" />
                  ) : userSearch ? (
                    <button
                      type="button"
                      onClick={() => {
                        setUserSearch("");
                        setDebouncedSearch("");
                        setIsDropdownOpen(false);
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                    >
                      <X className="size-3.5" />
                    </button>
                  ) : null}
                </div>

                {/* Dropdown kết quả tìm kiếm */}
                {isDropdownOpen && userSearch.trim().length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1.5 z-50 rounded-xl border border-border/80 bg-popover text-popover-foreground shadow-xl overflow-hidden">
                    {isSearching ? (
                      <div className="flex items-center justify-center gap-2 p-5 text-xs text-muted-foreground">
                        <Loader2 className="size-4 animate-spin text-primary" />
                        <span>Đang tìm kiếm người dùng...</span>
                      </div>
                    ) : searchResults.length === 0 ? (
                      <div className="flex flex-col items-center justify-center p-5 text-center text-xs text-muted-foreground">
                        <Users className="size-6 text-muted-foreground/40 mb-1" />
                        <span>
                          Không tìm thấy người dùng phù hợp với &quot;
                          {debouncedSearch}&quot;.
                        </span>
                      </div>
                    ) : (
                      <div className="max-h-56 overflow-y-auto p-1.5 space-y-1">
                        <div className="px-2 py-1 text-[11px] font-medium text-muted-foreground border-b border-border/50 mb-1">
                          Tìm thấy {searchResults.length} người dùng
                        </div>
                        {searchResults.map((user) => (
                          <div
                            key={user.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => {
                              setSelectedUser(user);
                              setForm((prev) => ({ ...prev, userId: user.id }));
                              setIsDropdownOpen(false);
                              setUserSearch("");
                              setDebouncedSearch("");
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
                                setSelectedUser(user);
                                setForm((prev) => ({
                                  ...prev,
                                  userId: user.id,
                                }));
                                setIsDropdownOpen(false);
                                setUserSearch("");
                                setDebouncedSearch("");
                              }
                            }}
                            className="flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors text-xs select-none hover:bg-muted/70 text-muted-foreground hover:text-foreground"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <Avatar
                                size="sm"
                                className="size-8 border border-border"
                              >
                                {user.avatar && (
                                  <AvatarImage
                                    src={user.avatar}
                                    alt={user.fullName || user.username}
                                  />
                                )}
                                <AvatarFallback className="text-[11px] bg-primary/10 text-primary">
                                  {getInitials(user.fullName || user.username)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col min-w-0">
                                <span className="font-semibold text-foreground truncate">
                                  {user.fullName || user.username}
                                </span>
                                <span className="text-[11px] text-muted-foreground truncate">
                                  @{user.username}{" "}
                                  {user.email ? `• ${user.email}` : ""}
                                </span>
                              </div>
                            </div>
                            <span className="text-[11px] text-primary font-medium shrink-0 ml-2">
                              Chọn
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
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
              Vai trò trong Workspace
            </Label>
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Shield className="size-3 text-primary" /> Phân quyền truy cập
            </span>
          </div>

          <RolePicker
            value={form.roleId}
            onValueChange={(val) => {
              setForm((prev) => ({ ...prev, roleId: val ?? null }));
              if (errors.roleId) {
                setErrors((prev) => {
                  const next = { ...prev };
                  delete next.roleId;
                  return next;
                });
              }
            }}
            placeholder="Chọn vai trò..."
            nullOptionLabel="Chọn vai trò"
            triggerClassName="h-9 w-full text-xs"
            contentClassName="w-80"
          />

          {errors.roleId && (
            <p className="text-[11px] text-destructive">{errors.roleId}</p>
          )}
        </div>

        {/* Phần 3: Trạng thái (Status) */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold">
            Trạng thái hoạt động <span className="text-destructive">*</span>
          </Label>
          <MasterDataPicker
            group="MS"
            value={form.status}
            onValueChange={(val) => {
              setForm((prev) => ({ ...prev, status: val }));
              if (errors.status) {
                setErrors((prev) => {
                  const next = { ...prev };
                  delete next.status;
                  return next;
                });
              }
            }}
            placeholder="Chọn trạng thái hoạt động..."
            triggerClassName="h-9 w-full text-xs"
            contentClassName="w-80"
          />
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
