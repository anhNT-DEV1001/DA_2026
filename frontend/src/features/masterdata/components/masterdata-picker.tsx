"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useMasterDataByGroup } from "../hooks";

export interface MasterDataPickerProps {
  /**
   * Nhóm master data cần truy vấn (ví dụ: "ACTION", "GENDER", ...)
   */
  group: string;
  /**
   * Giá trị value đang được chọn (ví dụ: "ACTION001")
   */
  value?: string;
  /**
   * Callback khi chọn giá trị (trả về item.value)
   */
  onValueChange?: (value: string) => void;
  /**
   * Text placeholder khi chưa chọn
   */
  placeholder?: string;
  /**
   * Vô hiệu hóa
   */
  disabled?: boolean;
  /**
   * Class tùy chỉnh cho SelectTrigger / Button
   */
  triggerClassName?: string;
}

export function MasterDataPicker({
  group,
  value,
  onValueChange,
  placeholder = "Chọn...",
  disabled = false,
  triggerClassName = "",
}: MasterDataPickerProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const { data: items = [], isLoading } = useMasterDataByGroup(group, {
    enabled: Boolean(group),
  });

  // Tìm item tương ứng với `value` đang được lưu
  const selectedItem = React.useMemo(() => {
    if (!value) return null;
    return items.find(
      (item) => item.value === value || String(item.id) === value,
    );
  }, [items, value]);

  // Ưu tiên hiển thị TÊN (name) của item khi đã chọn
  const displayLabel = React.useMemo(() => {
    if (isLoading) return "Đang tải...";
    if (selectedItem) {
      return selectedItem.name || selectedItem.value || value;
    }
    return value || placeholder;
  }, [isLoading, selectedItem, value, placeholder]);

  // Lọc các items theo từ khóa tìm kiếm
  const filteredItems = React.useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase().trim();
    return items.filter(
      (item) =>
        item.name?.toLowerCase().includes(q) ||
        item.value?.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q),
    );
  }, [items, search]);

  const handleSelect = (val: string) => {
    onValueChange?.(val);
    setOpen(false);
    setSearch("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled || isLoading}
            className={cn(
              "w-full justify-between font-normal text-xs px-2.5 h-8 bg-background border-input",
              !selectedItem && "text-muted-foreground",
              triggerClassName,
            )}
          >
            <span className="truncate">{displayLabel}</span>
            <ChevronsUpDown className="size-3.5 text-muted-foreground shrink-0 opacity-60 ml-1" />
          </Button>
        }
      />

      <PopoverContent className="w-56 p-2 gap-2" align="start">
        {/* Input Tìm kiếm */}
        <div className="relative w-full">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Tìm kiếm..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>

        {/* Danh sách cuộn scrollable */}
        <div className="max-h-48 overflow-y-auto flex flex-col gap-0.5 pt-1">
          {filteredItems.length === 0 ? (
            <p className="p-2 text-center text-xs text-muted-foreground">
              {isLoading ? "Đang tải dữ liệu..." : "Không tìm thấy kết quả"}
            </p>
          ) : (
            filteredItems.map((item) => {
              const itemVal = item.value || String(item.id);
              const isSelected = value === itemVal;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(itemVal)}
                  className={cn(
                    "flex items-center justify-between w-full px-2 py-1.5 text-xs rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors text-left",
                    isSelected && "bg-accent/60 font-medium",
                  )}
                >
                  <div className="flex flex-col min-w-0 pr-1">
                    <span className="truncate">{item.name || itemVal}</span>
                    {item.name && item.value && item.name !== item.value && (
                      <span className="text-[10px] text-muted-foreground font-mono truncate">
                        {item.value}
                      </span>
                    )}
                  </div>
                  {isSelected && (
                    <Check className="size-3.5 shrink-0 text-primary ml-1" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export const MasterDataSelect = MasterDataPicker;
