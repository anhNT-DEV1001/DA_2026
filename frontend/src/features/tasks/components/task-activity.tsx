"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TaskError } from "./task-controls";
import { TimelinePages } from "./timeline-pages";
import { useWorkspaceTaskActivity } from "../hooks";
import type { TaskTimelineProps } from "../types";

export function WorkspaceTaskActivity(props: TaskTimelineProps) {
  const [page, setPage] = useState(1);
  const query = useWorkspaceTaskActivity(
    props.workspaceId,
    props.queryKey,
    page,
  );
  const labels: Record<string, string> = {
    title: "tiêu đề",
    description: "mô tả",
    statusId: "trạng thái",
    assigneeIds: "người phụ trách",
    priority: "ưu tiên",
    startDate: "ngày bắt đầu",
    dueDate: "hạn hoàn thành",
    completedAt: "thời điểm hoàn thành",
  };
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Timeline hoạt động</h2>
          <p className="text-sm text-muted-foreground">
            Lịch sử task trong workspace, bao gồm task đã xóa. Mới nhất ở trên.
          </p>
        </div>
        <Button
          variant="outline"
          disabled={query.isFetching}
          onClick={() => void query.refetch()}
        >
          Tải lại
        </Button>
      </div>
      {query.isPending ? (
        <p role="status">Đang tải hoạt động…</p>
      ) : query.isError ? (
        <TaskError error={query.error} retry={() => void query.refetch()} />
      ) : (
        <>
          {!query.data.items.length && (
            <p className="rounded-lg border p-6 text-sm">
              Chưa có hoạt động task được ghi nhận.
            </p>
          )}
          <ol className="space-y-5">
            {query.data.items.map((item) => (
              <li key={item.id} className="relative ml-2 border-l-2 pl-5">
                <span
                  className="absolute -left-[5px] top-1 size-2 rounded-full bg-primary"
                  aria-hidden
                />
                <p className="text-sm text-muted-foreground">
                  <time dateTime={item.createdAt}>
                    {new Date(item.createdAt).toLocaleString("vi-VN")}
                  </time>{" "}
                  ·{" "}
                  {item.actorId
                    ? (props.names.get(item.actorId) ??
                      `Người dùng #${item.actorId}`)
                    : "Người dùng đã xóa"}
                </p>
                <p className="mt-1 font-medium">
                  {item.action === "created"
                    ? "Tạo task"
                    : item.action === "deleted"
                      ? "Xóa task"
                      : "Cập nhật task"}
                  :{" "}
                  {String(
                    (item.after ?? item.before)?.title ?? `#${item.taskId}`,
                  )}
                </p>
                {item.action === "updated" && (
                  <p className="text-sm text-muted-foreground">
                    Thay đổi:{" "}
                    {Object.keys(item.after ?? {})
                      .filter((key) => item.after?.[key] !== item.before?.[key])
                      .map((key) => labels[key] ?? key)
                      .join(", ")}
                  </p>
                )}
              </li>
            ))}
          </ol>
          <TimelinePages
            page={page}
            pageCount={query.data.meta.pageCount}
            setPage={setPage}
          />
        </>
      )}
    </section>
  );
}
