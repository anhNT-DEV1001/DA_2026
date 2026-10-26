"use client";

import * as React from "react";
import { EllipsisVertical, Plus, Sparkles, StickyNote, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "@/components/ui/toast";
import { useAuthStore } from "@/stores/auth-store";
import { NotesSheet, useNote } from "@/features/notes";

interface QuickToolButtonProps extends React.ComponentProps<typeof Button> {
  label: string;
}

/** Nút tròn trong thanh công cụ, có tooltip hiện bên phải */
function QuickToolButton({ label, className, ...props }: QuickToolButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label={label}
            className={cn(
              "size-8 rounded-full text-muted-foreground hover:text-foreground cursor-pointer",
              className,
            )}
            {...props}
          />
        }
      />
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

/**
 * Thanh công cụ nhanh ở chân cột icon của sidebar:
 * thu gọn thành 1 nút, mở ra gồm Ghi chú, AI, Thêm ghi chú, Đóng
 */
export function QuickTools() {
  const permissions = useAuthStore((s) => s.permissions);
  const { canViewNote, canCreateNote } = React.useMemo(() => {
    const has = (code: string) => permissions.some((p) => p.code === code);
    return {
      canViewNote: has("NOTE_VIEW"),
      canCreateNote: has("NOTE_CREATE"),
    };
  }, [permissions]);

  const [expanded, setExpanded] = React.useState(false);
  const [notesOpen, setNotesOpen] = React.useState(false);
  const [initialNoteId, setInitialNoteId] = React.useState<number | null>(
    null,
  );

  const { createNote, isCreating } = useNote();

  const openNotes = (noteId: number | null = null) => {
    setInitialNoteId(noteId);
    setNotesOpen(true);
  };

  const handleCreateNote = async () => {
    try {
      const created = await createNote({});
      openNotes(created.id);
    } catch (err: unknown) {
      toast.add({
        title: "Tạo ghi chú thất bại",
        description: err instanceof Error ? err.message : "Đã có lỗi xảy ra.",
        type: "error",
      });
    }
  };

  // TODO: cấu hình tính năng AI
  const handleOpenAI = () => {
    toast.add({
      title: "Trợ lý AI",
      description: "Tính năng đang được phát triển.",
      type: "info",
    });
  };

  return (
    <>
      <div className="flex flex-col items-center gap-1 rounded-full bg-background p-1 shadow-md ring-1 ring-foreground/10">
        {expanded ? (
          <div className="flex flex-col items-center gap-1 animate-in fade-in-0 slide-in-from-bottom-2 duration-150">
            {canViewNote && (
              <QuickToolButton
                label="Tất cả ghi chú"
                onClick={() => openNotes()}
              >
                <StickyNote className="size-4" />
              </QuickToolButton>
            )}
            <QuickToolButton label="Trợ lý AI" onClick={handleOpenAI}>
              <Sparkles className="size-4" />
            </QuickToolButton>
            {canCreateNote && (
              <QuickToolButton
                label="Thêm ghi chú"
                onClick={handleCreateNote}
                disabled={isCreating}
              >
                <Plus className="size-4" />
              </QuickToolButton>
            )}
            <QuickToolButton label="Đóng" onClick={() => setExpanded(false)}>
              <X className="size-4" />
            </QuickToolButton>
          </div>
        ) : (
          <QuickToolButton label="Công cụ" onClick={() => setExpanded(true)}>
            <EllipsisVertical className="size-4" />
          </QuickToolButton>
        )}
      </div>

      <NotesSheet
        open={notesOpen}
        onOpenChange={setNotesOpen}
        initialActiveId={initialNoteId}
      />
    </>
  );
}
