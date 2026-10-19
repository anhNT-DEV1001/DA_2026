"use client";
import { Button } from "@/components/ui/button";

export function TimelinePages({
  page,
  pageCount,
  setPage,
}: {
  page: number;
  pageCount: number;
  setPage: (page: number) => void;
}) {
  if (pageCount < 2) return null;
  return (
    <div className="flex items-center justify-end gap-3">
      <Button
        variant="outline"
        disabled={page <= 1}
        onClick={() => setPage(page - 1)}
      >
        Trước
      </Button>
      <span className="text-sm">
        Trang {page}/{pageCount}
      </span>
      <Button
        variant="outline"
        disabled={page >= pageCount}
        onClick={() => setPage(page + 1)}
      >
        Sau
      </Button>
    </div>
  );
}
