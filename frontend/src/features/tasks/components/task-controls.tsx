"use client";
import type { SelectHTMLAttributes } from "react";
import { Button } from "@/components/ui/button";

export function TaskSelect(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-60"
    />
  );
}
export function TaskError({
  error,
  retry,
}: {
  error: unknown;
  retry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-destructive/30 p-3 text-sm text-destructive"
    >
      {error instanceof Error ? error.message : "Không thể tải dữ liệu."}
      {retry && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="ml-3"
          onClick={retry}
        >
          Thử lại
        </Button>
      )}
    </div>
  );
}
