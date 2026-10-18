"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Search, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useRoleList } from "../hooks";
import type { RoleItem } from "../types";

export interface RolePickerProps {
  /**
   * ID của vai trò đang được chọn (truyền về backend, hỗ trợ null)
   */
  value?: number | null;
  /**
   * Callback khi thay đổi vai trò (trả về role.id dạng number hoặc null)
   */
  onValueChange?: (value: number | null) => void;
  /**
   * Placeholder khi chưa chọn
   */
  placeholder?: string;
  /**
   * Vô hiệu hóa picker
   */
  disabled?: boolean;
  /**
   * Class tùy biến cho Trigger Button
   */
  triggerClassName?: string;
  /**
   * Nhãn cho tùy chọn tất cả vai trò (nếu dùng cho bộ lọc)
   */
  allOptionLabel?: string;
  /**
   * Nhãn cho tùy chọn role null (ví dụ: "Chọn vai trò")
   */
  nullOptionLabel?: string;
  /**
   * Cho phép bỏ chọn về null
   */
  allowClear?: boolean;
  /**
   * Class tùy biến cho PopoverContent
   */
  contentClassName?: string;
}

export function RolePicker({
  value,
  onValueChange,
  placeholder = "Chọn vai trò...",
  disabled = false,
  triggerClassName = "",
  allOptionLabel,
  nullOptionLabel,
  allowClear = false,
  contentClassName = "",
}: RolePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const { data: rolesData, isLoading } = useRoleList({ limit: 100 });

  const items: RoleItem[] = React.useMemo(() => {
    if (!rolesData) return [];
    if (Array.isArray(rolesData)) return rolesData;
    return rolesData.items || [];
  }, [rolesData]);

  // Tìm role tương ứng với `value` (role.id) đang được chọn
  const selectedItem = React.useMemo(() => {
    if (value === undefined || value === null) return null;
    return items.find((item) => item.id === value);
  }, [items, value]);

  // Ưu tiên hiển thị role.description, fallback sang role.name, hoặc nullOptionLabel / placeholder
  const displayLabel = React.useMemo(() => {
    if (isLoading) return "Đang tải...";
    if (selectedItem) {
      return selectedItem.description || selectedItem.name;
    }
    return nullOptionLabel || placeholder;
  }, [isLoading, selectedItem, nullOptionLabel, placeholder]);

  // Lọc danh sách theo từ khóa tìm kiếm (name hoặc description)
  const filteredItems = React.useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase().trim();
    return items.filter(
      (item) =>
        item.name?.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q),
    );
  }, [items, search]);

  const handleSelect = (selectedId: number | null) => {
    if (allowClear && selectedId === value) {
      onValueChange?.(null);
    } else {
      onValueChange?.(selectedId);
    }
    setOpen(false);
    setSearch("");
  };

  const isNullSelected = value === null || value === undefined;

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
            <div className="flex items-center gap-2 truncate min-w-0">
              <Shield className="size-3.5 text-primary shrink-0 opacity-80" />
              <span className="truncate">{displayLabel}</span>
            </div>
            <ChevronsUpDown className="size-3.5 text-muted-foreground shrink-0 opacity-60 ml-1" />
          </Button>
        }
      />

      <PopoverContent
        className={cn("w-64 p-2 gap-2", contentClassName)}
        align="start"
      >
        {/* Ô tìm kiếm vai trò */}
        <div className="relative w-full">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Tìm vai trò..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>

        {/* Danh sách cuộn vai trò */}
        <div className="max-h-56 overflow-y-auto flex flex-col gap-0.5 pt-1">
          {allOptionLabel && (
            <button
              type="button"
              onClick={() => handleSelect(null)}
              className={cn(
                "flex items-center justify-between w-full px-2 py-1.5 text-xs rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors text-left",
                isNullSelected && "bg-accent/60 font-medium",
              )}
            >
              <span className="truncate">{allOptionLabel}</span>
              {isNullSelected && (
                <Check className="size-3.5 shrink-0 text-primary ml-1" />
              )}
            </button>
          )}

          {nullOptionLabel && (
            <button
              type="button"
              onClick={() => handleSelect(null)}
              className={cn(
                "flex items-center justify-between w-full px-2 py-1.5 text-xs rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors text-left",
                isNullSelected && "bg-accent/60 font-medium",
              )}
            >
              <div className="flex items-center gap-2 min-w-0 pr-1">
                <div className="size-5 rounded flex items-center justify-center shrink-0 bg-muted text-muted-foreground">
                  <Shield className="size-3 opacity-40" />
                </div>
                <span className="truncate text-muted-foreground italic">
                  {nullOptionLabel}
                </span>
              </div>
              {isNullSelected && (
                <Check className="size-3.5 shrink-0 text-primary ml-1" />
              )}
            </button>
          )}

          {filteredItems.length === 0 ? (
            <p className="p-2 text-center text-xs text-muted-foreground">
              {isLoading ? "Đang tải dữ liệu..." : "Không tìm thấy vai trò phù hợp"}
            </p>
          ) : (
            filteredItems.map((role) => {
              const isSelected = value === role.id;
              const title = role.description || role.name;
              const hasDifferentName =
                role.description &&
                role.name &&
                role.description.toLowerCase() !== role.name.toLowerCase();

              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => handleSelect(role.id)}
                  className={cn(
                    "flex items-center justify-between w-full px-2 py-1.5 text-xs rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors text-left",
                    isSelected && "bg-accent/60 font-medium",
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0 pr-1">
                    <div
                      className={cn(
                        "size-5 rounded flex items-center justify-center shrink-0",
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      <Shield className="size-3" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="truncate font-medium text-foreground">
                        {title}
                      </span>
                      {hasDifferentName && (
                        <span className="text-[10px] text-muted-foreground truncate">
                          Mã: {role.name}
                        </span>
                      )}
                    </div>
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

export const RoleSelect = RolePicker;
