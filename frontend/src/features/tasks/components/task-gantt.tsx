"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TaskDialog } from "./task-dialog";
import { TaskError } from "./task-controls";
import { TimelinePages } from "./timeline-pages";
import { useTaskList } from "../hooks";
import type { TaskTimelineProps } from "../types";

const dayMs = 86400000;
const dayNumber = (date: string) => Date.parse(`${date}T00:00:00Z`) / dayMs;
const dateAt = (day: number) =>
  new Date(day * dayMs).toISOString().slice(0, 10);
const localToday = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};
export function TaskGantt(props: TaskTimelineProps) {
  const [today] = useState(localToday);
  const [range, setRange] = useState(() => ({
    from: today,
    to: dateAt(dayNumber(today) + 30),
  }));
  const [draft, setDraft] = useState(range);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<number | null>(null);
  const query = useTaskList(
    props.workspaceId,
    props.queryKey,
    { ...range, page, limit: 50 },
    true,
    "gantt",
  );
  const first = dayNumber(range.from);
  const days = dayNumber(range.to) - first + 1;
  const width = days * 32;
  function shift(direction: number) {
    const next = {
      from: dateAt(first + direction * days),
      to: dateAt(first + direction * days + days - 1),
    };
    setRange(next);
    setDraft(next);
    setPage(1);
    setError("");
  }
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Gantt — kế hoạch task</h2>
        <p className="text-sm text-muted-foreground">
          Bấm tên hoặc thanh task để xem và chỉnh sửa ngày. Cuộn ngang để xem
          toàn bộ khoảng thời gian.
        </p>
      </div>
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          const count = dayNumber(draft.to) - dayNumber(draft.from) + 1;
          if (!Number.isFinite(count) || count < 1 || count > 93) {
            setError("Chọn khoảng ngày hợp lệ, tối đa 93 ngày mỗi lần xem.");
            return;
          }
          setRange(draft);
          setPage(1);
          setError("");
        }}
      >
        <label className="space-y-1 text-sm">
          Từ ngày
          <Input
            type="date"
            required
            value={draft.from}
            onChange={(e) => setDraft({ ...draft, from: e.target.value })}
          />
        </label>
        <label className="space-y-1 text-sm">
          Đến ngày
          <Input
            type="date"
            required
            value={draft.to}
            onChange={(e) => setDraft({ ...draft, to: e.target.value })}
          />
        </label>
        <Button type="submit">Xem</Button>
        <Button type="button" variant="outline" onClick={() => shift(-1)}>
          Khoảng trước
        </Button>
        <Button type="button" variant="outline" onClick={() => shift(1)}>
          Khoảng sau
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            const next = { from: today, to: dateAt(dayNumber(today) + 30) };
            setRange(next);
            setDraft(next);
            setPage(1);
            setError("");
          }}
        >
          Hôm nay
        </Button>
      </form>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Xanh dương: chưa hoàn thành · Xanh lá: hoàn thành · Vạch đỏ: hôm nay.
        Task chỉ có một ngày hiển thị tại ngày đó; task chưa đặt ngày nằm trong
        Danh sách.
      </p>
      {query.isPending ? (
        <p role="status">Đang tải kế hoạch…</p>
      ) : query.isError ? (
        <TaskError error={query.error} retry={() => void query.refetch()} />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {query.data.meta.itemCount} task trong khoảng ngày · Hiển thị{" "}
            {query.data.items.length} task trên trang {page}.
          </p>
          {!query.data.items.length ? (
            <p className="rounded-lg border p-6 text-sm">
              Chưa có task được lên lịch trong khoảng này. Đặt ngày cho task tại
              chế độ Danh sách hoặc chọn khoảng khác.
            </p>
          ) : (
            <div
              className="overflow-x-auto rounded-lg border"
              tabIndex={0}
              role="region"
              aria-label="Biểu đồ Gantt, cuộn ngang để xem các ngày"
            >
              <div style={{ minWidth: width + 220 }}>
                <div className="flex border-b bg-muted/40">
                  <div className="sticky left-0 z-20 w-[220px] shrink-0 bg-card p-3 text-sm font-semibold">
                    Task
                  </div>
                  <div className="relative h-12" style={{ width }}>
                    {Array.from({ length: days }, (_, i) => (
                      <div
                        key={i}
                        className="absolute flex h-full items-center border-l text-[10px] text-muted-foreground"
                        style={{ left: i * 32, width: 32 }}
                      >
                        {dateAt(first + i).slice(8)}/
                        {dateAt(first + i).slice(5, 7)}
                      </div>
                    ))}
                  </div>
                </div>
                {query.data.items.map((task) => {
                  const start = dayNumber(task.startDate ?? task.dueDate!);
                  const end = dayNumber(task.dueDate ?? task.startDate!);
                  const left = Math.max(start, first) - first;
                  const span =
                    Math.min(end, first + days - 1) -
                    Math.max(start, first) +
                    1;
                  const done = props.statuses.find(
                    (s) => s.id === task.statusId,
                  )?.isCompleted;
                  const title = `${task.title}: ${task.startDate ?? "Chưa đặt ngày bắt đầu"} → ${task.dueDate ?? "Chưa đặt hạn"}`;
                  return (
                    <div key={task.id} className="flex border-b last:border-0">
                      <button
                        className="sticky left-0 z-10 w-[220px] shrink-0 truncate bg-card p-3 text-left text-sm font-medium hover:underline focus-visible:outline-2"
                        title={title}
                        onClick={() => setSelected(task.id)}
                      >
                        {task.title}
                      </button>
                      <div
                        className="relative h-12"
                        style={{
                          width,
                          backgroundImage:
                            "linear-gradient(to right, var(--border) 1px, transparent 1px)",
                          backgroundSize: "32px 100%",
                        }}
                      >
                        {dayNumber(today) >= first &&
                          dayNumber(today) < first + days && (
                            <span
                              aria-hidden
                              className="pointer-events-none absolute inset-y-0 z-10 border-l-2 border-red-500"
                              style={{
                                left: (dayNumber(today) - first) * 32 + 16,
                              }}
                            />
                          )}
                        <button
                          aria-label={title}
                          title={title}
                          onClick={() => setSelected(task.id)}
                          className={`absolute top-2 h-8 truncate rounded px-2 text-left text-xs text-white focus-visible:outline-2 focus-visible:outline-offset-2 ${done ? "bg-emerald-700" : "bg-blue-700"}`}
                          style={{
                            left: left * 32 + 2,
                            width: Math.max(span * 32 - 4, 8),
                          }}
                        >
                          {task.title}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <TimelinePages
            page={page}
            pageCount={query.data.meta.pageCount}
            setPage={setPage}
          />
        </>
      )}
      {selected !== null && (
        <TaskDialog
          key={selected}
          {...props}
          taskId={selected}
          onClose={() => {
            setSelected(null);
            setPage(1);
          }}
        />
      )}
    </section>
  );
}
