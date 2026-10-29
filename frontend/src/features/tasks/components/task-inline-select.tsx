"use client";

import { ChevronDown, Loader2 } from "lucide-react";
import { Badge, badgeVariants } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

export interface InlineOption {
  value: string;
  label: string;
  variant?: BadgeVariant;
}

interface TaskInlineSelectProps {
  label: string;
  value: string;
  options: InlineOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  pending?: boolean;
}

/** Badge có thể bấm để đổi nhanh giá trị ngay trên bảng */
export function TaskInlineSelect({
  label,
  value,
  options,
  onChange,
  disabled,
  pending,
}: TaskInlineSelectProps) {
  const current = options.find((o) => o.value === value);
  const variant = current?.variant ?? "outline";
  const text = current?.label ?? value;

  if (disabled) return <Badge variant={variant}>{text}</Badge>;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={pending}
        aria-label={`Đổi ${label}`}
        className={cn(
          badgeVariants({ variant }),
          "cursor-pointer gap-1 pr-1.5 hover:ring-2 hover:ring-ring/30 data-popup-open:ring-2 data-popup-open:ring-ring/40 disabled:cursor-wait disabled:opacity-70",
        )}
      >
        {text}
        {pending ? (
          <Loader2 className="animate-spin" />
        ) : (
          <ChevronDown className="opacity-60" />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-auto min-w-40">
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(next) => {
            if (next !== value) onChange(String(next));
          }}
        >
          {options.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value}>
              <Badge variant={option.variant ?? "outline"}>
                {option.label}
              </Badge>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
