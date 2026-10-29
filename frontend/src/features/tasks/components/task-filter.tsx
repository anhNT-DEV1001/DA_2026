"use client";

import { useState, useEffect, useRef } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ComboboxPicker } from "@/components/common/combobox-picker";
import { MasterDataPicker } from "@/features/masterdata/components/masterdata-picker";
import { PRIORITY_GROUP, type TaskFilters, type TaskStatus } from "../types";

interface TaskFilterProps {
  filters: TaskFilters;
  statuses: TaskStatus[];
  names: Map<number, string>;
  /** Ẩn lọc trạng thái (board đã chia cột theo trạng thái) */
  hideStatus?: boolean;
  onChange: (next: Partial<TaskFilters>) => void;
}

export function TaskFilter({
  filters,
  statuses,
  names,
  hideStatus,
  onChange,
}: TaskFilterProps) {
  const [searchText, setSearchText] = useState(filters.search ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const search = searchText.trim() || undefined;
      if (search !== filters.search) onChange({ search });
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText]);

  return (
    <div className="flex flex-1 flex-wrap items-center gap-2">
      <div className="relative w-full max-w-lg flex-1">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          aria-label="Tìm theo tiêu đề task"
          placeholder="Tìm theo tiêu đề…"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="pl-8 h-9 text-sm"
        />
      </div>

      {!hideStatus && (
        <ComboboxPicker
          items={statuses.map((s) => ({ id: s.id, name: s.name }))}
          value={filters.statusId ? String(filters.statusId) : ""}
          onValueChange={(val) =>
            onChange({ statusId: val ? Number(val) : undefined })
          }
          allOptionLabel="Tất cả trạng thái"
          triggerClassName="h-9 min-w-36 text-sm w-auto"
        />
      )}

      <ComboboxPicker
        items={[...names].map(([id, name]) => ({ id, name }))}
        value={filters.assigneeId ? String(filters.assigneeId) : ""}
        onValueChange={(val) =>
          onChange({ assigneeId: val ? Number(val) : undefined })
        }
        allOptionLabel="Tất cả người phụ trách"
        triggerClassName="h-9 min-w-40 text-sm w-auto"
      />

      <MasterDataPicker
        group={PRIORITY_GROUP}
        value={filters.priority ?? ""}
        onValueChange={(val) => onChange({ priority: val || undefined })}
        allOptionLabel="Tất cả ưu tiên"
        triggerClassName="h-9 min-w-36 text-sm w-auto"
      />
    </div>
  );
}
