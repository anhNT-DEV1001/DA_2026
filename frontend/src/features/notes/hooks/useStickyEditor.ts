"use client";

import * as React from "react";
import { useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { Placeholder } from "@tiptap/extensions";
import { toast } from "@/components/ui/toast";
import { useNote } from "./useNote";
import type { NoteColor, NoteItem, UpdateNoteDto } from "../types";

// Thời gian chờ sau lần gõ cuối trước khi tự động lưu
const AUTOSAVE_DELAY = 700;
// Thời gian hiển thị toast "Hoàn tác" sau khi xóa
const UNDO_TIMEOUT = 6000;

interface UseStickyEditorOptions {
  canEdit?: boolean;
  autoFocus?: boolean;
}

/** Nội dung HTML hiện tại của editor (rỗng thì trả về "" thay vì "<p></p>") */
function getEditorHtml(editor: Editor): string {
  return editor.isEmpty ? "" : editor.getHTML();
}

/** Lấy nội dung HTML + text thuần từ editor để gửi lên server */
function getEditorPayload(editor: Editor): UpdateNoteDto {
  return {
    content: getEditorHtml(editor),
    contentText: editor.getText({ blockSeparator: "\n" }).trim(),
  };
}

/**
 * Trình soạn thảo Tiptap cho một ghi chú: tự động lưu, đổi màu, xóa (có hoàn tác).
 * Dùng chung cho thẻ trên trang /notes và mục ghi chú trong sidebar.
 */
export function useStickyEditor(
  note: NoteItem,
  { canEdit = true, autoFocus = false }: UseStickyEditorOptions = {},
) {
  const { updateNote, deleteNote, isDeleting, restoreNote } = useNote();

  // Nội dung đang chờ lưu + timer debounce (dùng ref để callback của editor luôn đọc giá trị mới nhất)
  const pendingRef = React.useRef<UpdateNoteDto | null>(null);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = React.useCallback(
    (dto: UpdateNoteDto) => {
      updateNote({ id: note.id, dto }).catch((err: unknown) => {
        toast.add({
          title: "Lưu ghi chú thất bại",
          description:
            err instanceof Error ? err.message : "Đã có lỗi xảy ra.",
          type: "error",
        });
      });
    },
    [note.id, updateNote],
  );

  const flush = React.useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (pendingRef.current) {
      const dto = pendingRef.current;
      pendingRef.current = null;
      save(dto);
    }
  }, [save]);

  const flushRef = React.useRef(flush);
  React.useEffect(() => {
    flushRef.current = flush;
  }, [flush]);

  const editor = useEditor({
    immediatelyRender: false,
    editable: canEdit,
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        code: false,
        codeBlock: false,
        horizontalRule: false,
        strike: false,
        underline: false,
        link: false,
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder: "Nhấn để nhập nội dung..." }),
    ],
    content: note.content,
    editorProps: {
      attributes: {
        class: "sticky-editor h-full text-sm leading-relaxed outline-none",
      },
    },
    onUpdate: ({ editor }) => {
      pendingRef.current = getEditorPayload(editor);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => flushRef.current(), AUTOSAVE_DELAY);
    },
    onBlur: () => flushRef.current(),
  });

  // Lưu nốt nội dung còn chờ khi editor bị gỡ khỏi màn hình (đổi trang, lọc tìm kiếm...)
  React.useEffect(() => {
    return () => flushRef.current();
  }, []);

  React.useEffect(() => {
    if (autoFocus && editor) {
      editor.commands.focus("end");
    }
  }, [autoFocus, editor]);

  // Đồng bộ khi ghi chú được sửa ở nơi khác (VD: sửa trong sidebar khi đang mở trang /notes)
  React.useEffect(() => {
    if (!editor || editor.isFocused || pendingRef.current) return;
    if (getEditorHtml(editor) !== note.content) {
      editor.commands.setContent(note.content, { emitUpdate: false });
    }
  }, [editor, note.content]);

  const activeState = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      isBold: e?.isActive("bold") ?? false,
      isItalic: e?.isActive("italic") ?? false,
      isTaskList: e?.isActive("taskList") ?? false,
    }),
  });

  const changeColor = (color: NoteColor) => {
    if (color === note.color) return;
    // Gửi kèm nội dung đang chờ (nếu có) để không bị mất
    const pending = pendingRef.current ?? {};
    pendingRef.current = null;
    if (timerRef.current) clearTimeout(timerRef.current);
    save({ ...pending, color });
  };

  const remove = async () => {
    // Hủy lần lưu đang chờ, ghi chú sắp bị xóa
    if (timerRef.current) clearTimeout(timerRef.current);
    pendingRef.current = null;
    try {
      await deleteNote(note.id);
      // Cho phép hoàn tác trong thời gian toast còn hiển thị
      const toastId = toast.add({
        title: "Đã xóa ghi chú",
        type: "success",
        timeout: UNDO_TIMEOUT,
        data: { showProgress: true },
        actionProps: {
          children: "Hoàn tác",
          onClick: () => {
            toast.close(toastId);
            restoreNote(note.id).catch((err: unknown) => {
              toast.add({
                title: "Hoàn tác thất bại",
                description:
                  err instanceof Error ? err.message : "Đã có lỗi xảy ra.",
                type: "error",
              });
            });
          },
        },
      });
    } catch (err: unknown) {
      toast.add({
        title: "Xóa ghi chú thất bại",
        description: err instanceof Error ? err.message : "Đã có lỗi xảy ra.",
        type: "error",
      });
    }
  };

  return {
    editor,
    activeState,
    changeColor,
    remove,
    isDeleting,
  };
}
