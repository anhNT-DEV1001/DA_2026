"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { SpaceQueryParams } from "../../types";
import { PlusCircle, Search, X } from "lucide-react";
import { SpaceDetailModal } from "./space-detail";

export interface SpaceFilterProps {
  workspaceId: number;
  params: SpaceQueryParams;
  onParamsChange: (params: SpaceQueryParams) => void;
  canCreate?: boolean;
}

export function SpaceFilter({
  workspaceId,
  params,
  onParamsChange,
  canCreate,
}: SpaceFilterProps) {
  const [search, setSearch] = React.useState(params.search ?? "");
  const [createOpen, setCreateOpen] = React.useState(false);

  // Debounce search
  React.useEffect(() => {
    const t = setTimeout(() => {
      if (search !== (params.search ?? "")) {
        onParamsChange({ ...params, search: search || undefined, page: 1 });
      }
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const handleClearSearch = () => {
    setSearch("");
    onParamsChange({ ...params, search: undefined, page: 1 });
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
      {/* Search */}
      <div className="relative flex-1 max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Tìm kiếm space..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 pr-8 text-xs h-9"
        />
        {search && (
          <button
            type="button"
            onClick={handleClearSearch}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {/* Create button */}
      {canCreate && (
        <>
          <Button
            size="sm"
            onClick={() => setCreateOpen(true)}
            className="ml-auto gap-1.5 text-xs shrink-0"
          >
            <PlusCircle className="size-3.5" />
            Tạo Space
          </Button>

          <SpaceDetailModal
            workspaceId={workspaceId}
            open={createOpen}
            onOpenChange={setCreateOpen}
          />
        </>
      )}
    </div>
  );
}
