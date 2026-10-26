"use client";

import * as React from "react";
import { Check, Palette } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { NOTE_COLORS, type NoteColor } from "../types";

/**
 * Màu nền thẻ ghi chú (card) và ô chọn màu (swatch) cho từng giá trị color
 */
export const NOTE_COLOR_STYLES: Record<
  NoteColor,
  { label: string; card: string; swatch: string; accent: string; text: string }
> = {
  yellow: {
    label: "Vàng",
    card: "bg-amber-100 dark:bg-amber-950/60",
    swatch: "bg-amber-200 dark:bg-amber-800",
    accent: "border-t-amber-400",
    text: "text-amber-600 dark:text-amber-400",
  },
  pink: {
    label: "Hồng",
    card: "bg-rose-100 dark:bg-rose-950/60",
    swatch: "bg-rose-200 dark:bg-rose-800",
    accent: "border-t-rose-400",
    text: "text-rose-600 dark:text-rose-400",
  },
  green: {
    label: "Xanh lá",
    card: "bg-emerald-100 dark:bg-emerald-950/60",
    swatch: "bg-emerald-200 dark:bg-emerald-800",
    accent: "border-t-emerald-400",
    text: "text-emerald-600 dark:text-emerald-400",
  },
  blue: {
    label: "Xanh dương",
    card: "bg-sky-100 dark:bg-sky-950/60",
    swatch: "bg-sky-200 dark:bg-sky-800",
    accent: "border-t-sky-400",
    text: "text-sky-600 dark:text-sky-400",
  },
  purple: {
    label: "Tím",
    card: "bg-violet-100 dark:bg-violet-950/60",
    swatch: "bg-violet-200 dark:bg-violet-800",
    accent: "border-t-violet-400",
    text: "text-violet-600 dark:text-violet-400",
  },
  orange: {
    label: "Cam",
    card: "bg-orange-100 dark:bg-orange-950/60",
    swatch: "bg-orange-200 dark:bg-orange-800",
    accent: "border-t-orange-400",
    text: "text-orange-600 dark:text-orange-400",
  },
  gray: {
    label: "Xám",
    card: "bg-zinc-100 dark:bg-zinc-800/80",
    swatch: "bg-zinc-200 dark:bg-zinc-600",
    accent: "border-t-zinc-400",
    text: "text-zinc-500 dark:text-zinc-400",
  },
};

interface NoteColorPickerProps {
  value: NoteColor;
  onChange: (color: NoteColor) => void;
  disabled?: boolean;
  triggerClassName?: string;
}

export function NoteColorPicker({
  value,
  onChange,
  disabled,
  triggerClassName,
}: NoteColorPickerProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Đổi màu ghi chú"
            title="Đổi màu"
            className={triggerClassName}
          >
            <Palette />
          </Button>
        }
      />
      <PopoverContent className="w-auto p-2" align="start" side="top">
        <div className="flex items-center gap-1.5">
          {NOTE_COLORS.map((color) => {
            const isActive = color === value;
            return (
              <button
                key={color}
                type="button"
                title={NOTE_COLOR_STYLES[color].label}
                aria-label={NOTE_COLOR_STYLES[color].label}
                aria-pressed={isActive}
                onClick={() => {
                  onChange(color);
                  setOpen(false);
                }}
                className={cn(
                  "flex size-7 items-center justify-center rounded-full ring-1 ring-foreground/10 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  NOTE_COLOR_STYLES[color].swatch,
                )}
              >
                {isActive && <Check className="size-3.5 text-foreground/80" />}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
