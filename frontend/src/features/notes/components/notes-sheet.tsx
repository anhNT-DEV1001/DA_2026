"use client";

import * as React from "react";
import Link from "next/link";
import { Maximize2, Plus, Search, StickyNote } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { toast } from "@/components/ui/toast";
import { useAuthStore } from "@/stores/auth-store";
import { useNote, useNoteList } from "../hooks";
import { NoteListItem } from "./note-list-item";

interface NotesSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Ghi chú được mở sẵn để sửa khi panel mở ra (VD: vừa tạo từ thanh công cụ)
  initialActiveId?: number | null;
}

/**
 * Panel bên phải liệt kê toàn bộ ghi chú,
 * bấm vào ghi chú để chỉnh sửa ngay trong panel
 */
export function NotesSheet({
  open,
  onOpenChange,
  initialActiveId = null,
}: NotesSheetProps) {
  const permissions = useAuthStore((s) => s.permissions);
  const { canView, canCreate, canUpdate, canDelete } = React.useMemo(() => {
    const has = (code: string) => permissions.some((p) => p.code === code);
    return {
      canView: has("NOTE_VIEW"),
      canCreate: has("NOTE_CREATE"),
      canUpdate: has("NOTE_UPDATE"),
      canDelete: has("NOTE_DELETE"),
    };
  }, [permissions]);

  // Tìm kiếm với debounce
  const [searchTerm, setSearchTerm] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
    }, 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Chỉ tải danh sách khi panel đang mở
  const { data: notes = [], isLoading } = useNoteList(
    debouncedSearch ? { search: debouncedSearch } : undefined,
    { enabled: open && canView },
  );
  const { createNote, isCreating } = useNote();

  // Ghi chú đang mở để sửa (được focus để gõ ngay)
  const [activeId, setActiveId] = React.useState<number | null>(null);

  // Mỗi lần panel mở ra thì mở sẵn ghi chú được yêu cầu (nếu có)
  const [prevOpen, setPrevOpen] = React.useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    setActiveId(open ? initialActiveId : null);
  }

  const clearSearch = () => {
    setSearchTerm("");
    setDebouncedSearch("");
  };

  const handleCreate = async () => {
    try {
      // Ghi chú mới đang rỗng sẽ không khớp từ khóa tìm kiếm, nên xóa tìm kiếm trước
      clearSearch();
      const created = await createNote({});
      setActiveId(created.id);
    } catch (err: unknown) {
      toast.add({
        title: "Tạo ghi chú thất bại",
        description: err instanceof Error ? err.message : "Đã có lỗi xảy ra.",
        type: "error",
      });
    }
  };

  if (!canView) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 sm:max-w-md">
        <SheetHeader className="gap-3 border-b pr-14">
          <div className="flex items-center gap-1">
            <SheetTitle className="flex-1 text-lg font-bold">Ghi chú</SheetTitle>
            {canCreate && (
              <Button
                variant="ghost"
                size="icon-sm"
                title="Thêm ghi chú"
                onClick={handleCreate}
                disabled={isCreating}
              >
                <Plus />
                <span className="sr-only">Thêm ghi chú</span>
              </Button>
            )}
            <Link
              href="/notes"
              title="Mở trang ghi chú"
              onClick={() => onOpenChange(false)}
              className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
            >
              <Maximize2 />
              <span className="sr-only">Mở trang ghi chú</span>
            </Link>
          </div>
          <SheetDescription className="sr-only">
            Danh sách ghi chú của bạn
          </SheetDescription>

          <div className="relative">
            <Input
              type="text"
              placeholder="Tìm kiếm..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 pr-9"
            />
            <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          </div>
        </SheetHeader>

        {/* Danh sách ghi chú */}
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-md" />
            ))
          ) : notes.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <StickyNote className="size-8 text-muted-foreground/60" />
              <p className="text-sm text-muted-foreground">
                {debouncedSearch
                  ? `Không tìm thấy ghi chú nào khớp với "${debouncedSearch}".`
                  : "Chưa có ghi chú nào."}
              </p>
            </div>
          ) : (
            notes.map((note) => (
              <NoteListItem
                key={note.id}
                note={note}
                active={note.id === activeId}
                onActivate={setActiveId}
                canEdit={canUpdate}
                canDelete={canDelete}
                autoFocus={note.id === activeId}
              />
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
