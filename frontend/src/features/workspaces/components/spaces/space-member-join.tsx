"use client";

import * as React from "react";
import { Modal } from "@/components/common/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import {
  useWorkspaceMemberList,
  useSpaceMemberList,
  useSpaceMember,
} from "../../hooks";
import type { WorkspaceMemberItem } from "../../types";
import {
  CheckCircle2,
  Loader2,
  Search,
  UserPlus,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface SpaceMemberJoinModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  workspaceId: number;
  spaceId: number;
  spaceName?: string;
  onSuccess?: () => void;
}

function getInitials(name?: string | null): string {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function SpaceMemberJoinModal({
  open,
  onOpenChange,
  workspaceId,
  spaceId,
  spaceName,
  onSuccess,
}: SpaceMemberJoinModalProps) {
  const [search, setSearch] = React.useState("");
  const [addingId, setAddingId] = React.useState<number | null>(null);

  // Reset search khi đóng/mở modal
  React.useEffect(() => {
    if (!open) {
      setSearch("");
      setAddingId(null);
    }
  }, [open]);

  // Lấy tất cả thành viên active của workspace (không phân trang)
  const { data: wmData, isLoading: isLoadingWm } = useWorkspaceMemberList(
    workspaceId,
    { status: "MS001" },
  );

  // Lấy thành viên đã có trong space (không phân trang)
  const { data: smData, isLoading: isLoadingSm } = useSpaceMemberList(
    workspaceId,
    spaceId,
  );

  const { addMember } = useSpaceMember(workspaceId, spaceId);

  // Tập hợp workspaceMemberId đã trong space
  const joinedSet = React.useMemo(() => {
    const set = new Set<number>();
    if (!smData) return set;
    const list = Array.isArray(smData) ? smData : smData.items ?? [];
    list.forEach((sm) => set.add(sm.workspaceMemberId));
    return set;
  }, [smData]);

  // Danh sách thành viên workspace (chỉ active)
  const workspaceMembers: WorkspaceMemberItem[] = React.useMemo(() => {
    if (!wmData) return [];
    return Array.isArray(wmData) ? wmData : wmData.items ?? [];
  }, [wmData]);

  // Lọc theo search
  const filtered = React.useMemo(() => {
    if (!search.trim()) return workspaceMembers;
    const q = search.trim().toLowerCase();
    return workspaceMembers.filter((m) => {
      const u = m.user;
      return (
        u?.fullName?.toLowerCase().includes(q) ||
        u?.username?.toLowerCase().includes(q) ||
        u?.email?.toLowerCase().includes(q)
      );
    });
  }, [workspaceMembers, search]);

  const isLoading = isLoadingWm || isLoadingSm;

  const handleAdd = async (member: WorkspaceMemberItem) => {
    if (!member.userId || addingId !== null) return;
    setAddingId(member.id);
    try {
      await addMember({
        workspaceId,
        spaceId,
        dto: { userId: member.userId },
      });
      toast.add({
        title: "Thêm thành công",
        description: `"${member.user?.fullName || member.user?.username}" đã tham gia space${spaceName ? ` "${spaceName}"` : ""}.`,
        type: "success",
      });
      onSuccess?.();
    } catch (err: unknown) {
      const error = err as {
        response?: { data?: { message?: string | string[] } };
        message?: string;
      };
      const msg = error?.response?.data?.message || error?.message;
      const display = Array.isArray(msg)
        ? msg.join(", ")
        : msg || "Có lỗi xảy ra, vui lòng thử lại.";
      toast.add({ title: "Thêm thất bại", description: display, type: "error" });
    } finally {
      setAddingId(null);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={`Thêm thành viên vào Space${spaceName ? ` "${spaceName}"` : ""}`}
      description="Chọn thành viên đang active trong workspace để thêm vào space này."
      icon={<UserPlus className="size-5 text-primary" />}
      showFooter={false}
    >
      <div className="flex flex-col gap-3 py-1">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm theo tên, username, email..."
            className="pl-9 text-xs h-9"
          />
        </div>

        {/* List */}
        <div className="rounded-xl border border-border overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-xs text-muted-foreground">
              <Loader2 className="size-4 animate-spin text-primary" />
              Đang tải danh sách thành viên...
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center text-xs text-muted-foreground gap-2">
              <Users className="size-8 text-muted-foreground/30" />
              {search.trim()
                ? `Không tìm thấy thành viên phù hợp với "${search}".`
                : "Workspace chưa có thành viên active nào."}
            </div>
          ) : (
            <div className="max-h-[360px] overflow-y-auto divide-y divide-border/50">
              {filtered.map((member) => {
                const isJoined = joinedSet.has(member.id);
                const isAdding = addingId === member.id;
                const displayName =
                  member.user?.fullName ||
                  member.user?.username ||
                  `#${member.userId}`;

                return (
                  <div
                    key={member.id}
                    className={cn(
                      "flex items-center justify-between px-4 py-3 transition-colors",
                      isJoined
                        ? "bg-muted/20"
                        : "hover:bg-muted/40",
                    )}
                  >
                    {/* Avatar + info */}
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar size="sm" className="size-9 border border-border shrink-0">
                        {member.user?.avatar && (
                          <AvatarImage
                            src={member.user.avatar}
                            alt={displayName}
                          />
                        )}
                        <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                          {getInitials(displayName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-semibold text-foreground truncate max-w-[220px]">
                          {displayName}
                        </span>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          {member.user?.username && (
                            <span>@{member.user.username}</span>
                          )}
                          {member.user?.email && (
                            <>
                              <span>•</span>
                              <span className="truncate max-w-[160px]">
                                {member.user.email}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action */}
                    {isJoined ? (
                      <Badge
                        variant="outline"
                        className="shrink-0 inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                      >
                        <CheckCircle2 className="size-3" />
                        Đã tham gia
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0 h-7 px-3 text-xs gap-1.5"
                        disabled={addingId !== null}
                        onClick={() => handleAdd(member)}
                      >
                        {isAdding ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <UserPlus className="size-3" />
                        )}
                        {isAdding ? "Đang thêm..." : "Thêm"}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer summary */}
        {!isLoading && workspaceMembers.length > 0 && (
          <p className="text-[11px] text-muted-foreground text-right">
            {joinedSet.size}/{workspaceMembers.length} thành viên đã tham gia space
          </p>
        )}
      </div>
    </Modal>
  );
}
