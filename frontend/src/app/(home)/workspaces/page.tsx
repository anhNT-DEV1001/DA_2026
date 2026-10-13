"use client";

import * as React from "react";
import {
  WorkspaceCards,
  WorkspaceTable,
  WorkspaceDetailModal,
  WORKSPACE_QUERY_KEYS,
  type WorkspaceItem,
} from "@/features/workspaces";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LayoutGrid, List, Plus, RefreshCw, Search } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

export default function WorkspacePage() {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = React.useState<"cards" | "table">("cards");
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [selectedWorkspace, setSelectedWorkspace] =
    React.useState<WorkspaceItem | null>(null);

  // Search & filter states
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [modeFilter, setModeFilter] = React.useState<
    "all" | "public" | "private"
  >("all");

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

  const handleEdit = (workspace: WorkspaceItem) => {
    setSelectedWorkspace(workspace);
    setModalOpen(true);
  };

  const queryParams = React.useMemo(() => {
    return {
      search: debouncedSearch || undefined,
      mode: modeFilter === "all" ? undefined : modeFilter,
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

          <Button
            size="sm"
            className="gap-1.5 text-xs font-medium"
            onClick={handleCreate}
          >
            <Plus className="size-3.5" />
            Tạo Workspace
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

          <select
            value={modeFilter}
            onChange={(e) =>
              setModeFilter(e.target.value as "all" | "public" | "private")
            }
            aria-label="Lọc theo chế độ"
            className="h-9 rounded-md border border-input bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary shrink-0"
          >
            <option value="all">Tất cả chế độ</option>
            <option value="public">Công khai (Public)</option>
            <option value="private">Riêng tư (Private)</option>
          </select>
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
              <Button
                size="sm"
                onClick={handleCreate}
                className="gap-1.5 text-xs"
              >
                <Plus className="size-3.5" />
                Tạo workspace đầu tiên
              </Button>
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
    </div>
  );
}
