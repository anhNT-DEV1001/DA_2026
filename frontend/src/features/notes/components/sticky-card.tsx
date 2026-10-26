"use client";

import * as React from "react";
import { EditorContent } from "@tiptap/react";
import { cn } from "@/lib/utils";
import { useStickyEditor } from "../hooks";
import type { NoteItem } from "../types";
import { NOTE_COLOR_STYLES } from "./note-color-picker";
import { StickyToolbar } from "./sticky-toolbar";

interface StickyCardProps {
  note: NoteItem;
  canEdit?: boolean;
  canDelete?: boolean;
  autoFocus?: boolean;
}

export function StickyCard({
  note,
  canEdit = true,
  canDelete = true,
  autoFocus = false,
}: StickyCardProps) {
  const { editor, activeState, changeColor, remove, isDeleting } =
    useStickyEditor(note, { canEdit, autoFocus });

  const colorStyle = NOTE_COLOR_STYLES[note.color] ?? NOTE_COLOR_STYLES.yellow;

  return (
    <div
      className={cn(
        "group/sticky flex h-80 flex-col rounded-xl p-5 pb-3 text-foreground transition-shadow focus-within:shadow-md hover:shadow-sm",
        colorStyle.card,
      )}
    >
      {/* Vùng soạn thảo */}
      <div
        className="min-h-0 flex-1 cursor-text overflow-y-auto"
        onClick={() => {
          if (editor && !editor.isFocused) editor.commands.focus("end");
        }}
      >
        <EditorContent editor={editor} className="h-full" />
      </div>

      {/* Thanh công cụ */}
      <StickyToolbar
        className="mt-3"
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
