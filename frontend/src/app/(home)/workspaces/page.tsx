"use client";

import * as React from "react";
import {
  WorkspaceCards,
  WorkspaceTable,
  WorkspaceDetailModal,
  WorkspaceRequestModal,
  WORKSPACE_QUERY_KEYS,
  type WorkspaceItem,
} from "@/features/workspaces";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  LayoutGrid,
  List,
  Plus,
  RefreshCw,
  Search,
  UserPlus,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { MasterDataPicker } from "@/features/masterdata/components/masterdata-picker";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";

export default function WorkspacePage() {
  const queryClient = useQueryClient();
  const permissions = useAuthStore((s) => s.permissions);
  const canCreate = React.useMemo(
    () => permissions.some((p) => p.code === "WORKSPACE_CREATE"),
    [permissions],
  );
  const [viewMode, setViewMode] = React.useState<"cards" | "table">("cards");
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [selectedWorkspace, setSelectedWorkspace] =
    React.useState<WorkspaceItem | null>(null);
  const [joinModalOpen, setJoinModalOpen] = React.useState(false);

  // Search & filter states
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [modeFilter, setModeFilter] = React.useState<string>("");

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({
      queryKey: WORKSPACE_QUERY_KEYS.all,
    });
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleCreate = () => {
    setSelectedWorkspace(null);
    setModalOpen(true);
  };

  const handleJoinWorkspace = () => {
    setJoinModalOpen(true);
  };

  const handleEdit = (workspace: WorkspaceItem) => {
    setSelectedWorkspace(workspace);
    setModalOpen(true);
  };

  const queryParams = React.useMemo(() => {
    return {
      search: debouncedSearch || undefined,
      mode: !modeFilter || modeFilter === "all" ? undefined : modeFilter,
    };
  }, [debouncedSearch, modeFilter]);

  return (
    <div className="flex flex-1 flex-col gap-5 p-4 w-full ">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-border/60">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Quản lý Workspaces
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Quản lý các không gian làm việc, dự án thành viên và quyền truy cập
            dữ liệu.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
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

          {canCreate && (
            <Button
              size="sm"
              className="gap-1.5 text-xs font-medium"
              onClick={handleCreate}
            >
              <Plus className="size-3.5" />
              Tạo Workspace
            </Button>
          )}

          <Button
            size="sm"
            // variant="outline"
            className="gap-1.5 text-xs font-medium bg-green-600 text-white hover:bg-green-700"
            onClick={handleJoinWorkspace}
          >
            <UserPlus className="size-3.5" />
            Tham gia
          </Button>
        </div>
      </div>

      {/* Filter and View Toggle Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Search input & Mode filter */}
        <div className="flex items-center gap-2.5 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm workspace theo tên..."
              className="pl-8 text-xs h-9"
            />
          </div>

          <MasterDataPicker
            group="WSM"
            value={modeFilter}
            onValueChange={setModeFilter}
            placeholder="Tất cả chế độ"
            allOptionLabel="Tất cả chế độ"
            allowClear
            triggerClassName="w-40 sm:w-44 h-9 shrink-0"
          />
        </div>

        {/* View Mode Toggle (Cards / Table) */}
        <div className="flex items-center self-end sm:self-auto rounded-lg border border-border p-0.5 bg-muted/40">
          <button
            type="button"
            onClick={() => setViewMode("cards")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
              viewMode === "cards"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
            title="Xem dạng thẻ (Grid)"
          >
            <LayoutGrid className="size-3.5" />
            <span>Thẻ</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("table")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
              viewMode === "table"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
            title="Xem dạng bảng (Table)"
          >
            <List className="size-3.5" />
            <span>Bảng</span>
          </button>
        </div>
      </div>

      {/* Content: Cards or Table */}
      <div className="w-full">
        {viewMode === "cards" ? (
          <WorkspaceCards
            queryParams={queryParams}
            onEdit={handleEdit}
            emptyAction={
              canCreate ? (
                <Button
                  size="sm"
                  onClick={handleCreate}
                  className="gap-1.5 text-xs"
                >
                  <Plus className="size-3.5" />
                  Tạo workspace đầu tiên
                </Button>
              ) : undefined
            }
          />
        ) : (
          <WorkspaceTable queryParams={queryParams} onEdit={handleEdit} />
        )}
      </div>

      {/* Modal Thêm & Cập nhật Workspace */}
      <WorkspaceDetailModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        workspace={selectedWorkspace}
      />

      {/* Modal Tìm kiếm & Tham gia Workspace */}
      <WorkspaceRequestModal
        open={joinModalOpen}
        onOpenChange={setJoinModalOpen}
      />
    </div>
  );
}
