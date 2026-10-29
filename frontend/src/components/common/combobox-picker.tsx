"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface ComboboxItem {
  id: number | string;
  name: string;
}

interface BaseProps {
  items: ComboboxItem[];
  placeholder?: string;
  allOptionLabel?: string;
  disabled?: boolean;
  triggerClassName?: string;
  contentClassName?: string;
}

interface SingleSelectProps extends BaseProps {
  multiSelect?: false;
  value?: string;
  onValueChange?: (value: string) => void;
}

interface MultiSelectProps extends BaseProps {
  multiSelect: true;
  selectedValues?: string[];
  onSelectedValuesChange?: (values: string[]) => void;
}

export type ComboboxPickerProps = SingleSelectProps | MultiSelectProps;

export function ComboboxPicker(props: ComboboxPickerProps) {
  const {
    items,
    placeholder = "Chọn...",
    allOptionLabel,
    disabled = false,
    triggerClassName = "",
    contentClassName = "",
  } = props;

  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const isMulti = props.multiSelect === true;
  const singleValue = !isMulti ? (props as SingleSelectProps).value : undefined;
  const multiValues = isMulti
    ? ((props as MultiSelectProps).selectedValues ?? [])
    : undefined;

  const selectedItem = React.useMemo(() => {
    if (isMulti) return null;
    return items.find((item) => String(item.id) === singleValue) ?? null;
  }, [items, singleValue, isMulti]);

  const selectedItems = React.useMemo(() => {
    if (!isMulti) return [];
    return (multiValues ?? [])
      .map((v) => items.find((item) => String(item.id) === v))
      .filter(Boolean) as ComboboxItem[];
  }, [items, multiValues, isMulti]);

  const displayLabel = React.useMemo(() => {
    if (isMulti) {
      if (!selectedItems.length) return allOptionLabel ?? placeholder;
      if (selectedItems.length === 1) return selectedItems[0].name;
      return `${selectedItems.length} được chọn`;
    }
    if (selectedItem) return selectedItem.name;
    if (!singleValue && allOptionLabel) return allOptionLabel;
    return placeholder;
  }, [isMulti, selectedItem, selectedItems, singleValue, allOptionLabel, placeholder]);

  const filteredItems = React.useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase().trim();
    return items.filter((item) => item.name.toLowerCase().includes(q));
  }, [items, search]);

  const handleSingleSelect = (val: string) => {
    (props as SingleSelectProps).onValueChange?.(val);
    setOpen(false);
    setSearch("");
  };

  const handleMultiToggle = (val: string) => {
    const current = (props as MultiSelectProps).selectedValues ?? [];
    const next = current.includes(val)
      ? current.filter((v) => v !== val)
      : [...current, val];
    (props as MultiSelectProps).onSelectedValuesChange?.(next);
  };

  const handleRemoveChip = (val: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const current = (props as MultiSelectProps).selectedValues ?? [];
    (props as MultiSelectProps).onSelectedValuesChange?.(
      current.filter((v) => v !== val),
    );
  };

  const isSelected = (val: string) => {
    if (isMulti) return (multiValues ?? []).includes(val);
    return singleValue === val;
  };

  return (
    <div className="flex flex-col gap-1.5">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              disabled={disabled}
              className={cn(
                "w-full justify-between font-normal text-xs px-2.5 h-8 bg-background border-input",
                isMulti
                  ? selectedItems.length === 0 && "text-muted-foreground"
                  : !selectedItem && "text-muted-foreground",
                triggerClassName,
              )}
            >
              <span className="truncate">{displayLabel}</span>
              <ChevronsUpDown className="size-3.5 text-muted-foreground shrink-0 opacity-60 ml-1" />
            </Button>
          }
        />

        <PopoverContent
          className={cn("w-56 p-2 gap-2", contentClassName)}
          align="start"
        >
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

          <div className="max-h-48 overflow-y-auto flex flex-col gap-0.5 pt-1">
            {allOptionLabel && !isMulti && (
              <button
                type="button"
                onClick={() => handleSingleSelect("")}
                className={cn(
                  "flex items-center justify-between w-full px-2 py-1.5 text-xs rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors text-left",
                  !singleValue && "bg-accent/60 font-medium",
                )}
              >
                <span className="truncate">{allOptionLabel}</span>
                {!singleValue && (
                  <Check className="size-3.5 shrink-0 text-primary ml-1" />
                )}
              </button>
            )}

            {isMulti && (multiValues ?? []).length > 0 && (
              <button
                type="button"
                onClick={() =>
                  (props as MultiSelectProps).onSelectedValuesChange?.([])
                }
                className="flex items-center w-full px-2 py-1.5 text-xs rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors text-left text-muted-foreground"
              >
                Bỏ chọn tất cả
              </button>
            )}

            {filteredItems.length === 0 ? (
              <p className="p-2 text-center text-xs text-muted-foreground">
                Không tìm thấy kết quả
              </p>
            ) : (
              filteredItems.map((item) => {
                const itemVal = String(item.id);
                const selected = isSelected(itemVal);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() =>
                      isMulti
                        ? handleMultiToggle(itemVal)
                        : handleSingleSelect(itemVal)
                    }
                    className={cn(
                      "flex items-center justify-between w-full px-2 py-1.5 text-xs rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors text-left",
                      selected && "bg-accent/60 font-medium",
                    )}
                  >
                    <span className="truncate">{item.name}</span>
                    {selected && (
                      <Check className="size-3.5 shrink-0 text-primary ml-1" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>

      {isMulti && selectedItems.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedItems.map((item) => (
            <Badge
              key={item.id}
              variant="secondary"
              className="gap-1 pr-1 text-xs font-normal"
            >
              {item.name}
              <button
                type="button"
                disabled={disabled}
                onClick={(e) => handleRemoveChip(String(item.id), e)}
                className="rounded-full hover:bg-muted-foreground/20 p-0.5 disabled:opacity-50"
                aria-label={`Bỏ ${item.name}`}
              >
                <X className="size-2.5" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
