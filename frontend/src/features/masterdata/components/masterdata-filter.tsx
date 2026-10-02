"use client";

import * as React from "react";
import { Search, RotateCcw, Filter, Check, ChevronsUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface MasterDataGroupOption {
  group: string;
  nameGroup?: string | null;
}

export interface MasterDataFilterProps {
  selectedGroup: string;
  onGroupChange: (group: string) => void;
  searchQuery: string;
  onSearchChange: (search: string) => void;
  groupOptions?: MasterDataGroupOption[];
  onReset?: () => void;
  className?: string;
}

export function MasterDataFilter({
  selectedGroup,
  onGroupChange,
  searchQuery,
  onSearchChange,
  groupOptions = [],
  onReset,
  className = "",
}: MasterDataFilterProps) {
  const [openCombobox, setOpenCombobox] = React.useState(false);
  const [comboboxSearch, setComboboxSearch] = React.useState("");

  const hasActiveFilter =
    Boolean(selectedGroup && selectedGroup !== "ALL") || Boolean(searchQuery);

  // Chỉ lấy nameGroup nếu có, ngược lại lấy group (không ghép dạng `(GROUP)`)
  const getGroupLabel = (opt: MasterDataGroupOption) => {
    return opt.nameGroup || opt.group;
  };

  // Label tên nhóm đang được chọn
  const selectedLabel = React.useMemo(() => {
    if (!selectedGroup || selectedGroup === "ALL") return "Tất cả nhóm";
    const found = groupOptions.find((g) => g.group === selectedGroup);
    return found ? getGroupLabel(found) : selectedGroup;
  }, [selectedGroup, groupOptions]);

  // Lọc danh sách các nhóm theo từ khóa gõ trong combobox
  const filteredGroupOptions = React.useMemo(() => {
    if (!comboboxSearch.trim()) return groupOptions;
    const q = comboboxSearch.toLowerCase().trim();
    return groupOptions.filter(
      (opt) =>
        (opt.nameGroup && opt.nameGroup.toLowerCase().includes(q)) ||
        opt.group.toLowerCase().includes(q),
    );
  }, [groupOptions, comboboxSearch]);

  const handleSelectGroup = (groupValue: string) => {
    onGroupChange(groupValue === "ALL" ? "" : groupValue);
    setOpenCombobox(false);
    setComboboxSearch("");
  };

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 bg-card border rounded-lg shadow-xs",
        className,
      )}
    >
      <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Searchable Combobox Select Nhóm Master Data */}
        <div className="w-full sm:w-64">
          <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
            <PopoverTrigger
              render={
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openCombobox}
                  className="w-full justify-between font-normal px-3"
                >
                  <div className="flex items-center gap-2 truncate">
                    <Filter className="size-4 text-muted-foreground shrink-0" />
                    <span className="truncate">{selectedLabel}</span>
                  </div>
                  <ChevronsUpDown className="size-4 text-muted-foreground shrink-0 opacity-50" />
                </Button>
              }
            />

            <PopoverContent className="w-64 p-2 gap-2" align="start">
              {/* Input tìm kiếm nhóm */}
              <div className="relative w-full">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Tìm kiếm nhóm..."
                  value={comboboxSearch}
                  onChange={(e) => setComboboxSearch(e.target.value)}
                  className="pl-8 h-8 text-xs"
                />
              </div>

              {/* Scrollable list options */}
              <div className="max-h-56 overflow-y-auto flex flex-col gap-0.5 pt-1">
                <button
                  type="button"
                  onClick={() => handleSelectGroup("ALL")}
                  className={cn(
                    "flex items-center justify-between w-full px-2 py-1.5 text-xs rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors text-left",
                    (!selectedGroup || selectedGroup === "ALL") &&
                      "bg-accent/60 font-medium",
                  )}
                >
                  <span className="truncate">Tất cả nhóm</span>
                  {(!selectedGroup || selectedGroup === "ALL") && (
                    <Check className="size-3.5 shrink-0 text-primary" />
                  )}
                </button>

                {filteredGroupOptions.length === 0 ? (
                  <p className="p-2 text-center text-xs text-muted-foreground">
                    Không tìm thấy nhóm nào
                  </p>
                ) : (
                  filteredGroupOptions.map((opt) => {
                    const isSelected = selectedGroup === opt.group;
                    const label = getGroupLabel(opt);
                    return (
                      <button
                        key={opt.group}
                        type="button"
                        onClick={() => handleSelectGroup(opt.group)}
                        className={cn(
                          "flex items-center justify-between w-full px-2 py-1.5 text-xs rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors text-left",
                          isSelected && "bg-accent/60 font-medium",
                        )}
                      >
                        <span className="truncate">{label}</span>
                        {isSelected && (
                          <Check className="size-3.5 shrink-0 text-primary" />
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Input Tìm kiếm theo tên master data */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Tìm kiếm theo tên master data..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Reset Filter Button */}
      {hasActiveFilter && onReset && (
        <Button
          variant="outline"
          size="sm"
          onClick={onReset}
          className="self-start sm:self-auto gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="size-3.5" />
          Đặt lại
        </Button>
      )}
    </div>
  );
}
