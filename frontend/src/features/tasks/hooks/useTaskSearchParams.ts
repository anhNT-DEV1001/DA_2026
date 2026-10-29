"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { TaskFilters, TaskView } from "../types";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

function positiveInt(value: string | null) {
  const num = Number(value);
  return Number.isInteger(num) && num > 0 ? num : undefined;
}

/**
 * Đồng bộ tab và bộ lọc task với URL query
 * (vd: ?tab=list|board|activity&search=abc&statusId=1&assigneeId=2&priority=PRIORITY001&page=2&limit=50)
 * để giữ trạng thái khi tải lại trang hoặc chia sẻ link.
 */
export function useTaskSearchParams(spaceId: number) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tab = searchParams.get("tab");
  // Mặc định hiển thị kanban
  const view: TaskView = tab === "activity" || tab === "list" ? tab : "board";

  const filters = useMemo<TaskFilters>(
    () => ({
      page: positiveInt(searchParams.get("page")) ?? DEFAULT_PAGE,
      limit: positiveInt(searchParams.get("limit")) ?? DEFAULT_LIMIT,
      search: searchParams.get("search") || undefined,
      statusId: positiveInt(searchParams.get("statusId")),
      assigneeId: positiveInt(searchParams.get("assigneeId")),
      priority: searchParams.get("priority") || undefined,
      spaceId,
    }),
    [searchParams, spaceId],
  );

  function update(values: Record<string, string | number | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(values)) {
      if (value === undefined || value === "") params.delete(key);
      else params.set(key, String(value));
    }
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  function setView(next: TaskView) {
    update({ tab: next === "board" ? undefined : next });
  }

  /** Cập nhật bộ lọc; mặc định quay về trang 1 */
  function setFilters(next: Partial<TaskFilters>, resetPage = true) {
    const merged = { ...filters, ...next };
    if (resetPage && next.page === undefined) merged.page = DEFAULT_PAGE;
    update({
      search: merged.search,
      statusId: merged.statusId,
      assigneeId: merged.assigneeId,
      priority: merged.priority,
      page: merged.page,
      limit: merged.limit,
    });
  }

  /** Ghi page/limit mặc định vào URL nếu chưa có */
  function ensurePagination() {
    if (searchParams.has("page") && searchParams.has("limit")) return;
    update({ page: filters.page, limit: filters.limit });
  }

  return { view, setView, filters, setFilters, ensurePagination };
}
