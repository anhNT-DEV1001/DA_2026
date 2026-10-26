"use client";

import * as React from "react";
import { Plus, Search, StickyNote, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { useAuthStore } from "@/stores/auth-store";
import { useNote, useNoteList } from "../hooks";
import { StickyCard } from "./sticky-card";

const gridClass =
  "grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-4";

export function StickyBoard() {
  const permissions = useAuthStore((s) => s.permissions);
  const { canCreate, canUpdate, canDelete } = React.useMemo(() => {
    const has = (code: string) => permissions.some((p) => p.code === code);
    return {
      canCreate: has("NOTE_CREATE"),
      canUpdate: has("NOTE_UPDATE"),
      canDelete: has("NOTE_DELETE"),
    };
  }, [permissions]);

  // Tìm kiếm với debounce
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
    }, 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data: notes = [], isLoading } = useNoteList(
    debouncedSearch ? { search: debouncedSearch } : undefined,
  );
  const { createNote, isCreating } = useNote();

  // Ghi chú vừa tạo sẽ được focus để gõ ngay
  const [newNoteId, setNewNoteId] = React.useState<number | null>(null);

  const closeSearch = () => {
    setSearchTerm("");
    setDebouncedSearch("");
    setSearchOpen(false);
  };

  const handleCreate = async () => {
    try {
      // Ghi chú mới đang rỗng sẽ không khớp từ khóa tìm kiếm, nên đóng tìm kiếm trước
      closeSearch();
      const created = await createNote({});
      setNewNoteId(created.id);
    } catch (err: unknown) {
      toast.add({
        title: "Tạo ghi chú thất bại",
        description: err instanceof Error ? err.message : "Đã có lỗi xảy ra.",
        type: "error",
      });
    }
  };

  return (
    <section className="space-y-4">
      {/* Thanh tác vụ */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-foreground/80">
          Ghi chú của bạn
        </h2>

        <div className="flex items-center gap-2">
          {searchOpen ? (
            <div className="relative w-48 sm:w-64">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                autoFocus
                type="text"
                placeholder="Tìm kiếm ghi chú..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && closeSearch()}
                onBlur={() => !searchTerm && setSearchOpen(false)}
                className="h-8 pl-8 pr-8 text-sm"
              />
              <button
                type="button"
                aria-label="Đóng tìm kiếm"
                onMouseDown={(e) => e.preventDefault()}
                onClick={closeSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Tìm kiếm ghi chú"
              title="Tìm kiếm"
              onClick={() => setSearchOpen(true)}
            >
              <Search />
            </Button>
          )}

          {canCreate && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={handleCreate}
              disabled={isCreating}
            >
              <Plus className="size-4" />
              Thêm ghi chú
            </Button>
          )}
        </div>
      </div>

      {/* Danh sách ghi chú */}
      {isLoading ? (
        <div className={gridClass}>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-80 rounded-xl" />
          ))}
        </div>
      ) : notes.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-16 text-center">
          <StickyNote className="size-8 text-muted-foreground/60" />
          <p className="text-sm text-muted-foreground">
            {debouncedSearch
              ? `Không tìm thấy ghi chú nào khớp với "${debouncedSearch}".`
              : "Chưa có ghi chú nào. Hãy thêm ghi chú đầu tiên của bạn."}
          </p>
        </div>
      ) : (
        <div className={gridClass}>
          {notes.map((note) => (
            <StickyCard
              key={note.id}
              note={note}
              canEdit={canUpdate}
              canDelete={canDelete}
              autoFocus={note.id === newNoteId}
            />
          ))}
        </div>
      )}
    </section>
  );
}
