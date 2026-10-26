"use client";

import * as React from "react";
import type { Editor } from "@tiptap/react";
import { Bold, Italic, ListChecks, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { NoteColor } from "../types";
import { NoteColorPicker } from "./note-color-picker";

const toolbarButtonClass =
  "text-foreground/70 hover:bg-foreground/10 hover:text-foreground aria-pressed:bg-foreground/10 aria-pressed:text-foreground";

interface StickyToolbarProps {
  editor: Editor | null;
  activeState?: {
    isBold: boolean;
    isItalic: boolean;
    isTaskList: boolean;
  } | null;
  color: NoteColor;
  onColorChange: (color: NoteColor) => void;
  onDelete: () => void;
  canEdit?: boolean;
  canDelete?: boolean;
  isDeleting?: boolean;
  className?: string;
}

/**
 * Thanh công cụ của ghi chú: đổi màu, in đậm, in nghiêng, checklist, xóa
 */
export function StickyToolbar({
  editor,
  activeState,
  color,
  onColorChange,
  onDelete,
  canEdit = true,
  canDelete = true,
  isDeleting,
  className,
}: StickyToolbarProps) {
  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      {canEdit && (
        <>
          <NoteColorPicker
            value={color}
            onChange={onColorChange}
            triggerClassName={toolbarButtonClass}
          />
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="In đậm"
            title="In đậm (Ctrl+B)"
            aria-pressed={activeState?.isBold}
            className={toolbarButtonClass}
            onClick={() => editor?.chain().focus().toggleBold().run()}
          >
            <Bold />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="In nghiêng"
            title="In nghiêng (Ctrl+I)"
            aria-pressed={activeState?.isItalic}
            className={toolbarButtonClass}
            onClick={() => editor?.chain().focus().toggleItalic().run()}
          >
            <Italic />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Danh sách việc cần làm"
            title="Checklist"
            aria-pressed={activeState?.isTaskList}
            className={toolbarButtonClass}
            onClick={() => editor?.chain().focus().toggleTaskList().run()}
          >
            <ListChecks />
          </Button>
        </>
      )}

      {canDelete && (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Xóa ghi chú"
          title="Xóa"
          disabled={isDeleting}
          className={cn(toolbarButtonClass, "ml-auto hover:text-destructive")}
          onClick={onDelete}
        >
          <Trash2 />
        </Button>
      )}
    </div>
  );
}
