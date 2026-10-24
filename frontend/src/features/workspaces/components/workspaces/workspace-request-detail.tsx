"use client";

import * as React from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalBody,
  ModalFooter,
} from "@/components/common/modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import { useWorkspaceSearch, WORKSPACE_QUERY_KEYS } from "../../hooks";
import { workspaceService } from "../../services";
import { MasterDataPicker } from "@/features/masterdata/components/masterdata-picker";
import { useAuthStore } from "@/stores/auth-store";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { WorkspaceSearchItem, WorkspaceSearchParams } from "../../types";
import {
  Search,
  Users,
  ChevronLeft,
  ChevronRight,
  Loader2,
  UserPlus,
  CheckCircle2,
  Clock,
  XCircle,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* =========================================================================
   Join status helpers
   ========================================================================= */

type JoinStatus = "MS001" | "MS002" | "MS003" | null | undefined;

function JoinStatusBadge({ status }: { status: JoinStatus }) {
  if (status === "MS001") {
    return (
      <Badge
        variant="outline"
        className="gap-1 text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-400"
      >
        <CheckCircle2 className="size-3" />
        Đã tham gia
      </Badge>
    );
  }
  if (status === "MS002") {
    return (
      <Badge
        variant="outline"
        className="gap-1 text-amber-600 border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-400"
      >
        <Clock className="size-3" />
        Chờ duyệt
      </Badge>
    );
  }
  if (status === "MS003") {
    return (
      <Badge
        variant="outline"
        className="gap-1 text-rose-600 border-rose-200 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-800 dark:text-rose-400"
      >
        <XCircle className="size-3" />
        Đã từ chối
      </Badge>
    );
  }
  return null;
}

function JoinButton({
  workspace,
  onRequest,
  isPending,
}: {
  workspace: WorkspaceSearchItem;
  onRequest: (workspace: WorkspaceSearchItem) => void;
  isPending: boolean;
}) {
  const status = workspace.joinStatus as JoinStatus;

  if (status === "MS001") {
    return (
      <Button size="sm" variant="outline" disabled className="text-xs gap-1">
        <CheckCircle2 className="size-3" />
        Đã tham gia
      </Button>
    );
  }
  if (status === "MS002") {
    return (
      <Button size="sm" variant="outline" disabled className="text-xs gap-1">
        <Clock className="size-3" />
        Đang chờ
      </Button>
    );
  }

  return (
    <Button
      size="sm"
      className="text-xs gap-1"
      onClick={() => onRequest(workspace)}
      disabled={isPending}
    >
      {isPending ? (
        <Loader2 className="size-3 animate-spin" />
      ) : (
        <UserPlus className="size-3" />
      )}
      Tham gia
    </Button>
  );
}

/* =========================================================================
   Workspace search result card
   ========================================================================= */

function WorkspaceSearchCard({
  workspace,
  onRequest,
  requestingId,
}: {
  workspace: WorkspaceSearchItem;
  onRequest: (workspace: WorkspaceSearchItem) => void;
  requestingId: number | null;
}) {
  const isPending = requestingId === workspace.id;

  return (
    <div className="flex items-start gap-3 p-3 rounded-xl border border-border/60 bg-card hover:bg-muted/30 transition-colors">
      {/* Icon */}
      <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Building2 className="size-5 text-primary" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-foreground truncate">
            {workspace.name}
          </span>
          {workspace.joinStatus && (
            <JoinStatusBadge status={workspace.joinStatus as JoinStatus} />
          )}
        </div>

        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
          {workspace.description ?? "Không có mô tả"}
        </p>

        <div className="flex flex-wrap items-center gap-2 mt-1.5">
          {workspace.modeName && (
            <Badge variant="secondary" className="text-xs px-1.5 py-0">
              {workspace.modeName}
            </Badge>
          )}
          {workspace.owner && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Users className="size-3" />
              {workspace.owner.fullName ?? workspace.owner.username}
            </span>
          )}
        </div>
      </div>

      {/* Action */}
      <div className="shrink-0">
        <JoinButton
          workspace={workspace}
          onRequest={onRequest}
          isPending={isPending}
        />
      </div>
    </div>
  );
}

/* =========================================================================
   Main modal component
   ========================================================================= */

export interface WorkspaceRequestModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

export function WorkspaceRequestModal({
  open,
  onOpenChange,
  trigger,
}: WorkspaceRequestModalProps) {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [modeFilter, setModeFilter] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [requestingId, setRequestingId] = React.useState<number | null>(null);

  // Reset khi đóng modal
  React.useEffect(() => {
    if (!open) {
      setSearch("");
      setDebouncedSearch("");
      setModeFilter("");
      setPage(1);
    }
  }, [open]);

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset page khi filter mode thay đổi
  React.useEffect(() => {
    setPage(1);
  }, [modeFilter]);

  const searchParams: WorkspaceSearchParams = React.useMemo(
    () => ({
      search: debouncedSearch || undefined,
      mode: !modeFilter || modeFilter === "all" ? undefined : modeFilter,
      page,
      limit: 8,
    }),
    [debouncedSearch, modeFilter, page],
  );

  const { data, isLoading, isFetching } = useWorkspaceSearch(searchParams);

  const items = data?.items ?? [];
  const meta = data?.meta;

  // Mutation gửi yêu cầu tham gia
  const joinMutation = useMutation({
    mutationFn: async (workspace: WorkspaceSearchItem) => {
      if (!user?.id) throw new Error("Bạn chưa đăng nhập.");
      return workspaceService.addMember(workspace.id, {
        userId: user.id,
        status: "MS002",
      });
    },
    onMutate: (workspace) => setRequestingId(workspace.id),
    onSuccess: (_, workspace) => {
      toast.add({
        title: "Đã gửi yêu cầu",
        description: `Yêu cầu tham gia "${workspace.name}" đang chờ chủ sở hữu duyệt.`,
        type: "success",
      });
      queryClient.invalidateQueries({
        queryKey: WORKSPACE_QUERY_KEYS.search(),
      });
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error ? err.message : "Không thể gửi yêu cầu tham gia.";
      toast.add({
        title: "Thất bại",
        description: message,
        type: "error",
      });
    },
    onSettled: () => setRequestingId(null),
  });

  const handleRequest = (workspace: WorkspaceSearchItem) => {
    joinMutation.mutate(workspace);
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      trigger={trigger}
      size="lg"
      showFooter={false}
    >
      <ModalContent size="lg" className="flex flex-col">
        <ModalHeader variant="info" icon={<UserPlus className="size-5" />}>
          <ModalTitle>Tìm và tham gia Workspace</ModalTitle>
          <ModalDescription>
            Tìm kiếm không gian làm việc và gửi yêu cầu tham gia — chủ sở hữu sẽ
            xét duyệt yêu cầu của bạn.
          </ModalDescription>
        </ModalHeader>

        <ModalBody className="flex flex-col gap-4">
          {/* Search & Filter */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm kiếm theo tên, slug hoặc mô tả..."
                className="pl-8 text-xs h-9"
                autoFocus
              />
            </div>
            <MasterDataPicker
              group="WSM"
              value={modeFilter}
              onValueChange={setModeFilter}
              placeholder="Tất cả chế độ"
              allOptionLabel="Tất cả chế độ"
              allowClear
              triggerClassName="w-36 h-9 shrink-0 text-xs"
            />
          </div>

          {/* Results */}
          <div className="flex flex-col gap-2 min-h-[320px]">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-[320px] gap-3 text-muted-foreground">
                <Loader2 className="size-6 animate-spin" />
                <span className="text-sm">Đang tìm kiếm...</span>
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[320px] gap-3 text-muted-foreground">
                <Search className="size-8 opacity-30" />
                <p className="text-sm font-medium">
                  {debouncedSearch
                    ? `Không tìm thấy workspace nào cho "${debouncedSearch}"`
                    : "Không có workspace nào"}
                </p>
                <p className="text-xs opacity-70">
                  Thử thay đổi từ khóa hoặc bộ lọc
                </p>
              </div>
            ) : (
              <div
                className={cn(
                  "flex flex-col gap-2 transition-opacity",
                  isFetching && "opacity-60 pointer-events-none",
                )}
              >
                {items.map((ws) => (
                  <WorkspaceSearchCard
                    key={ws.id}
                    workspace={ws}
                    onRequest={handleRequest}
                    requestingId={requestingId}
                  />
                ))}
              </div>
            )}
          </div>
        </ModalBody>

        {/* Pagination footer */}
        {meta && meta.pageCount > 1 && (
          <ModalFooter bordered className="justify-between">
            <span className="text-xs text-muted-foreground">
              {meta.itemCount} kết quả · Trang {meta.page}/{meta.pageCount}
            </span>
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="outline"
                className="size-7"
                disabled={!meta.hasPreviousPage || isFetching}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="size-3.5" />
              </Button>
              <Button
                size="icon"
                variant="outline"
                className="size-7"
                disabled={!meta.hasNextPage || isFetching}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </ModalFooter>
        )}
      </ModalContent>
    </Modal>
  );
}
