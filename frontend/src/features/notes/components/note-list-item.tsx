"use client";

import * as React from "react";
import { EditorContent } from "@tiptap/react";
import { format, isToday } from "date-fns";
import { cn } from "@/lib/utils";
import { useStickyEditor } from "../hooks";
import type { NoteItem } from "../types";
import { NOTE_COLOR_STYLES } from "./note-color-picker";
import { StickyToolbar } from "./sticky-toolbar";

interface NoteListItemProps {
  note: NoteItem;
  // Đang mở để chỉnh sửa
  active?: boolean;
  onActivate?: (noteId: number) => void;
  canEdit?: boolean;
  canDelete?: boolean;
  autoFocus?: boolean;
}

/** Hôm nay thì hiện giờ (HH:mm), ngày khác hiện ngày (dd/MM/yyyy) */
function formatNoteTime(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (isNaN(date.getTime())) return "";
  return isToday(date) ? format(date, "HH:mm") : format(date, "dd/MM/yyyy");
}

/**
 * Một ghi chú trong sidebar: thu gọn thì hiển thị xem trước,
 * bấm vào thì mở trình soạn thảo ngay tại chỗ
 */
export function NoteListItem({
  note,
  active = false,
  onActivate,
  canEdit = true,
  canDelete = true,
  autoFocus = false,
}: NoteListItemProps) {
  const colorStyle = NOTE_COLOR_STYLES[note.color] ?? NOTE_COLOR_STYLES.yellow;
  const time = formatNoteTime(note.updatedAt ?? note.createdAt);

  if (active) {
    return (
      <ActiveNoteItem
        note={note}
        time={time}
        canEdit={canEdit}
        canDelete={canDelete}
        autoFocus={autoFocus}
      />
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onActivate?.(note.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onActivate?.(note.id);
        }
      }}
      className={cn(
        "cursor-pointer rounded-md border-t-4 bg-muted/60 px-4 pb-4 pt-2 text-left outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring",
        colorStyle.accent,
      )}
    >
      <div className={cn("mb-1 text-right text-xs", colorStyle.text)}>
        {time}
      </div>
      {note.contentText ? (
        <p className="line-clamp-6 whitespace-pre-line break-words text-sm leading-relaxed">
          {note.contentText}
        </p>
      ) : (
        <p className="text-sm italic text-muted-foreground">Ghi chú trống</p>
      )}
    </div>
  );
}

/** Tách riêng để chỉ tạo editor Tiptap cho ghi chú đang được mở */
function ActiveNoteItem({
  note,
  time,
  canEdit,
  canDelete,
  autoFocus,
}: {
  note: NoteItem;
  time: string;
  canEdit: boolean;
  canDelete: boolean;
  autoFocus: boolean;
}) {
  const { editor, activeState, changeColor, remove, isDeleting } =
    useStickyEditor(note, { canEdit, autoFocus });

  const colorStyle = NOTE_COLOR_STYLES[note.color] ?? NOTE_COLOR_STYLES.yellow;

  return (
    <div
      className={cn(
        "rounded-md border-t-4 px-4 pb-2 pt-2 text-foreground shadow-sm",
        colorStyle.accent,
        colorStyle.card,
      )}
    >
      <div className={cn("mb-1 text-right text-xs", colorStyle.text)}>
        {time}
      </div>

      {/* Vùng soạn thảo */}
      <div
        className="max-h-80 min-h-32 cursor-text overflow-y-auto"
        onClick={() => {
          if (editor && !editor.isFocused) editor.commands.focus("end");
        }}
      >
        <EditorContent editor={editor} className="min-h-32" />
      </div>

      <StickyToolbar
        className="mt-2"
        editor={editor}
        activeState={activeState}
        color={note.color}
        onColorChange={changeColor}
        onDelete={remove}
        canEdit={canEdit}
        canDelete={canDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
}
