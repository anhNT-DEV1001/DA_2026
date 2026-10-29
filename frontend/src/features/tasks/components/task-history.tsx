"use client";

import { useState, type ComponentType, type ReactNode } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import {
  ArrowRight,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleDot,
  Clock,
  FileText,
  Flag,
  LayoutGrid,
  List,
  Pencil,
  Plus,
  Trash2,
  Type,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ComboboxPicker } from "@/components/common/combobox-picker";
import { htmlToText } from "@/components/common/rich-text-editor";
import { useMasterDataByGroup } from "@/features/masterdata/hooks";
import {
  PRIORITY_GROUP,
  type Activity,
  type Page,
  type TaskSnapshot,
  type TaskStatus,
} from "../types";
import { useTaskHistory } from "../hooks";
import { TaskError } from "./task-controls";
import { TimelinePages } from "./timeline-pages";

type FieldKey =
  | "title"
  | "description"
  | "statusId"
  | "priority"
  | "assigneeIds"
  | "startDate"
  | "dueDate"
  | "completedAt";

const fields: {
  key: FieldKey;
  label: string;
  icon: ComponentType<{ className?: string }>;
  tone: string;
}[] = [
  { key: "title", label: "Tiêu đề", icon: Type, tone: "bg-slate-500" },
  { key: "statusId", label: "Trạng thái", icon: CircleDot, tone: "bg-blue-500" },
  { key: "priority", label: "Ưu tiên", icon: Flag, tone: "bg-orange-500" },
  { key: "assigneeIds", label: "Người phụ trách", icon: Users, tone: "bg-violet-500" },
  { key: "startDate", label: "Ngày bắt đầu", icon: CalendarDays, tone: "bg-teal-600" },
  { key: "dueDate", label: "Hạn hoàn thành", icon: CalendarClock, tone: "bg-pink-500" },
  { key: "completedAt", label: "Hoàn thành lúc", icon: CheckCircle2, tone: "bg-green-600" },
  { key: "description", label: "Mô tả", icon: FileText, tone: "bg-indigo-500" },
];

const fieldLabel = Object.fromEntries(fields.map((f) => [f.key, f.label]));

/** Các field đổi khi task hoàn thành: tô xanh để nổi bật */
const statusKeys: FieldKey[] = ["statusId", "completedAt"];
const completedCell =
  "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/40";

/** Nhóm lọc theo loại thay đổi */
const filters: { id: string; name: string; keys?: FieldKey[] }[] = [
  { id: "all", name: "Tất cả loại thay đổi" },
  { id: "created", name: "Tạo task" },
  { id: "status", name: "Trạng thái", keys: ["statusId", "completedAt"] },
  { id: "assignee", name: "Người phụ trách", keys: ["assigneeIds"] },
  { id: "date", name: "Ngày", keys: ["startDate", "dueDate"] },
  { id: "priority", name: "Ưu tiên", keys: ["priority"] },
  { id: "content", name: "Tiêu đề / mô tả", keys: ["title", "description"] },
  { id: "deleted", name: "Xóa task" },
];

type Mode = "timeline" | "board";
const MODE_STORAGE_KEY = "task-history-mode";

function readMode(): Mode {
  try {
    return localStorage.getItem(MODE_STORAGE_KEY) === "board"
      ? "board"
      : "timeline";
  } catch {
    return "timeline";
  }
}

function changedKeys(item: Activity): FieldKey[] {
  if (item.action !== "updated") return [];
  return fields
    .map((f) => f.key)
    .filter(
      (key) =>
        JSON.stringify(item.before?.[key]) !== JSON.stringify(item.after?.[key]),
    );
}

/** Task vừa chuyển sang trạng thái hoàn thành */
function isCompletion(item: Activity) {
  return (
    item.action === "updated" &&
    !item.before?.completedAt &&
    !!item.after?.completedAt
  );
}

function actionLabel(item: Activity, changed: FieldKey[]) {
  if (item.action === "created") return "Tạo task";
  if (item.action === "deleted") return "Xóa task";
  // "Hoàn thành lúc" do hệ thống tự ghi theo trạng thái → không tính là thay đổi riêng
  const own = changed.includes("statusId")
    ? changed.filter((key) => key !== "completedAt")
    : changed;
  if (own.length === 1) return `Cập nhật ${fieldLabel[own[0]].toLowerCase()}`;
  return "Cập nhật thông tin";
}

function matchesFilter(item: Activity, filter: string) {
  if (filter === "all") return true;
  if (filter === "created" || filter === "deleted")
    return item.action === filter;
  const keys = filters.find((f) => f.id === filter)?.keys ?? [];
  return changedKeys(item).some((key) => keys.includes(key));
}

function dayKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function timeOf(iso: string) {
  return new Date(iso).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

type Props = {
  workspaceId: number;
  queryKey: readonly unknown[];
  taskId: number;
  statuses: TaskStatus[];
  names: Map<number, string>;
};

/** Lịch sử thay đổi của một task, hiển thị dạng timeline hoặc board */
export function TaskHistory(props: Props) {
  const [page, setPage] = useState(1);
  const history = useTaskHistory(
    props.workspaceId,
    props.queryKey,
    props.taskId,
    page,
  );
  return (
    <ActivityHistory
      history={history}
      page={page}
      setPage={setPage}
      statuses={props.statuses}
      names={props.names}
    />
  );
}

type ActivityHistoryProps = {
  history: UseQueryResult<Page<Activity>>;
  page: number;
  setPage: (page: number) => void;
  statuses: TaskStatus[];
  names: Map<number, string>;
  /** Hiện tên task trên mỗi mục (khi lịch sử gồm nhiều task) */
  showTask?: boolean;
  onOpenTask?: (taskId: number) => void;
};

/** Danh sách hoạt động dạng timeline / board, có lọc theo loại thay đổi */
export function ActivityHistory({
  history,
  page,
  setPage,
  showTask,
  onOpenTask,
  ...props
}: ActivityHistoryProps) {
  const [mode, setModeState] = useState<Mode>(readMode);
  const [filter, setFilter] = useState("all");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const renderTask = showTask
    ? (item: Activity) => <TaskRef item={item} onOpen={onOpenTask} />
    : undefined;
  const priorities = useMasterDataByGroup(PRIORITY_GROUP);

  function setMode(next: Mode) {
    setModeState(next);
    try {
      localStorage.setItem(MODE_STORAGE_KEY, next);
    } catch {
      // Bỏ qua khi trình duyệt chặn storage
    }
  }

  function personName(id: number) {
    return props.names.get(id) ?? `Người dùng #${id}`;
  }

  function actorName(item: Activity) {
    return item.actorId ? personName(item.actorId) : "Người dùng đã xóa";
  }

  function format(
    key: FieldKey,
    value: unknown,
    snapshot?: TaskSnapshot | null,
  ): string {
    if (value === null || value === undefined || value === "") return "Chưa có";
    if (key === "statusId")
      return (
        snapshot?.statusName ??
        props.statuses.find((s) => s.id === value)?.name ??
        `Trạng thái #${value}`
      );
    if (key === "assigneeIds") {
      const ids = Array.isArray(value) ? (value as number[]) : [];
      return ids.length ? ids.map(personName).join(", ") : "Chưa giao";
    }
    if (key === "priority")
      return (
        priorities.data?.find((p) => p.value === value)?.name ?? String(value)
      );
    if (key === "completedAt")
      return new Date(String(value)).toLocaleString("vi-VN");
    if (key === "startDate" || key === "dueDate")
      return new Date(`${String(value)}T00:00:00`).toLocaleDateString("vi-VN");
    if (key === "description") return htmlToText(String(value)) || "Chưa có";
    return String(value);
  }

  /** Diff người phụ trách: chỉ nêu người được thêm / bỏ */
  function assigneeDiff(item: Activity) {
    const before = item.before?.assigneeIds ?? [];
    const after = item.after?.assigneeIds ?? [];
    const added = after.filter((id) => !before.includes(id));
    const removed = before.filter((id) => !after.includes(id));
    return { added, removed };
  }

  const items = (history.data?.items ?? []).filter((item) =>
    matchesFilter(item, filter),
  );

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2">
      <ComboboxPicker
        items={filters.map(({ id, name }) => ({ id, name }))}
        value={filter}
        onValueChange={(val) => setFilter(val || "all")}
        placeholder="Loại thay đổi"
        triggerClassName="h-8 w-48 text-xs"
      />
      <div className="ml-auto flex items-center gap-2">
        {mode === "timeline" && items.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={() =>
              setCollapsed(
                collapsed.size
                  ? new Set()
                  : new Set(items.map((i) => dayKey(i.createdAt))),
              )
            }
          >
            {collapsed.size ? "Mở tất cả" : "Thu gọn tất cả"}
          </Button>
        )}
        <div
          className="flex items-center rounded-lg border border-border bg-muted/40 p-0.5"
          aria-label="Chế độ hiển thị lịch sử"
        >
          {(
            [
              { value: "timeline", label: "Timeline", icon: List },
              { value: "board", label: "Board", icon: LayoutGrid },
            ] as const
          ).map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              aria-pressed={mode === value}
              title={label}
              onClick={() => setMode(value)}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all",
                mode === value
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  if (history.isPending)
    return (
      <div className="space-y-4">
        {toolbar}
        <p role="status" className="text-sm text-muted-foreground">
          Đang tải lịch sử…
        </p>
      </div>
    );
  if (history.isError)
    return (
      <div className="space-y-4">
        {toolbar}
        <TaskError error={history.error} retry={() => void history.refetch()} />
      </div>
    );

  return (
    <div className="space-y-4">
      {toolbar}
      {!items.length ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          {history.data.items.length
            ? "Không có thay đổi phù hợp bộ lọc trên trang này."
            : "Chưa có lịch sử được ghi nhận."}
        </p>
      ) : mode === "timeline" ? (
        <TimelineView
          items={items}
          collapsed={collapsed}
          toggle={(key) => {
            const next = new Set(collapsed);
            if (!next.delete(key)) next.add(key);
            setCollapsed(next);
          }}
          actorName={actorName}
          format={format}
          assigneeDiff={assigneeDiff}
          personName={personName}
          renderTask={renderTask}
        />
      ) : (
        <ol className="space-y-3">
          {items.map((item) => (
            <BoardCard
              key={item.id}
              item={item}
              actorName={actorName}
              format={format}
              renderTask={renderTask}
            />
          ))}
        </ol>
      )}
      <TimelinePages
        page={page}
        pageCount={history.data.meta.pageCount}
        setPage={setPage}
      />
    </div>
  );
}

/** Tên task của mục lịch sử; bấm để mở task (task đã xóa thì chỉ hiển thị) */
function TaskRef({
  item,
  onOpen,
}: {
  item: Activity;
  onOpen?: (taskId: number) => void;
}) {
  const title = (item.after ?? item.before)?.title || `Task #${item.taskId}`;
  const deleted = item.action === "deleted";
  const className =
    "inline-block max-w-64 truncate rounded-md bg-muted px-1.5 py-0.5 align-middle text-xs font-medium text-foreground";
  if (!onOpen || deleted)
    return (
      <span className={cn(className, deleted && "line-through")} title={title}>
        {title}
      </span>
    );
  return (
    <button
      type="button"
      title={`Mở task: ${title}`}
      onClick={() => onOpen(item.taskId)}
      className={cn(className, "hover:bg-primary/10 hover:text-primary")}
    >
      {title}
    </button>
  );
}

type FormatFn = (
  key: FieldKey,
  value: unknown,
  snapshot?: TaskSnapshot | null,
) => string;

function ActionBadge({ item, changed }: { item: Activity; changed: FieldKey[] }) {
  const completed = isCompletion(item);
  const Icon = completed
    ? CheckCircle2
    : item.action === "created"
      ? Plus
      : item.action === "deleted"
        ? Trash2
        : Pencil;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold",
        item.action === "created" &&
          "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-300",
        item.action === "updated" &&
          !completed &&
          "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300",
        completed &&
          "border-green-600 bg-green-600 text-white shadow-sm shadow-green-600/30 dark:border-green-500 dark:bg-green-600",
        item.action === "deleted" &&
          "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300",
      )}
    >
      <Icon className="size-3" />
      {actionLabel(item, changed)}
    </span>
  );
}

function TimelineView({
  items,
  collapsed,
  toggle,
  actorName,
  format,
  assigneeDiff,
  personName,
  renderTask,
}: {
  items: Activity[];
  collapsed: Set<string>;
  toggle: (key: string) => void;
  actorName: (item: Activity) => string;
  format: FormatFn;
  assigneeDiff: (item: Activity) => { added: number[]; removed: number[] };
  personName: (id: number) => string;
  renderTask?: (item: Activity) => ReactNode;
}) {
  const groups: { key: string; date: string; items: Activity[] }[] = [];
  for (const item of items) {
    const key = dayKey(item.createdAt);
    const last = groups.at(-1);
    if (last?.key === key) last.items.push(item);
    else groups.push({ key, date: item.createdAt, items: [item] });
  }

  return (
    <div className="space-y-3">
      {groups.map((group, groupIndex) => {
        const open = !collapsed.has(group.key);
        const weekday = new Date(group.date).toLocaleDateString("vi-VN", {
          weekday: "long",
        });
        return (
          <section key={group.key}>
            <button
              type="button"
              aria-expanded={open}
              onClick={() => toggle(group.key)}
              className="flex w-full items-center gap-2 rounded-full border bg-background px-3 py-1.5 text-sm shadow-xs hover:bg-muted/50"
            >
              <CalendarDays className="size-4 text-muted-foreground" />
              <span className="font-semibold capitalize">{weekday}</span>
              <span className="font-semibold">
                {new Date(group.date).toLocaleDateString("vi-VN")}
              </span>
              <span className="text-xs text-muted-foreground">
                · {group.items.length} thay đổi
              </span>
              <ChevronDown
                className={cn(
                  "ml-auto size-4 text-muted-foreground transition-transform",
                  !open && "-rotate-90",
                )}
              />
            </button>
            {open && (
              <ol className="ml-4 space-y-3 border-l-2 border-border pb-1 pl-5 pt-3">
                {group.items.map((item, index) => {
                  const changed = changedKeys(item);
                  const snapshot = item.after ?? item.before;
                  const completed = isCompletion(item);
                  return (
                    <li key={item.id} className="relative space-y-2">
                      <span
                        aria-hidden
                        className={cn(
                          "absolute -left-[27px] top-2 size-2.5 rounded-full ring-4 ring-background",
                          completed
                            ? "bg-green-500 ring-green-500/25"
                            : groupIndex === 0 && index === 0
                              ? "bg-primary"
                              : "bg-primary/50",
                        )}
                      />
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <ActionBadge item={item} changed={changed} />
                        {renderTask?.(item)}
                        <span className="inline-flex items-center gap-1">
                          <Clock className="size-3" />
                          <time dateTime={item.createdAt}>
                            {timeOf(item.createdAt)}
                          </time>
                        </span>
                        <span>
                          bởi{" "}
                          <span className="font-medium text-foreground">
                            {actorName(item)}
                          </span>
                        </span>
                      </div>

                      {item.action === "updated" ? (
                        <div className="space-y-1.5">
                          {changed.map((key) => (
                            <div
                              key={key}
                              className={cn(
                                "rounded-md border px-3 py-2 text-sm",
                                completed && statusKeys.includes(key)
                                  ? completedCell
                                  : "bg-background",
                              )}
                            >
                              {changed.length > 1 && (
                                <span className="mr-1.5 font-medium">
                                  {fieldLabel[key]}:
                                </span>
                              )}
                              {key === "assigneeIds" ? (
                                <AssigneeChange
                                  {...assigneeDiff(item)}
                                  personName={personName}
                                />
                              ) : (
                                <ValueChange
                                  before={format(key, item.before?.[key], item.before)}
                                  after={format(key, item.after?.[key], item.after)}
                                  long={key === "description"}
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        snapshot && (
                          <div className="rounded-md border bg-background px-3 py-2 text-sm">
                            <span
                              className={cn(
                                "font-medium",
                                item.action === "deleted" && "line-through",
                              )}
                            >
                              {snapshot.title}
                            </span>
                            <span className="text-muted-foreground">
                              {" "}
                              · {format("statusId", snapshot.statusId, snapshot)}
                            </span>
                          </div>
                        )
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        );
      })}
    </div>
  );
}

function ValueChange({
  before,
  after,
  long,
}: {
  before: string;
  after: string;
  long?: boolean;
}) {
  if (long)
    return (
      <div className="mt-1 space-y-1">
        <p className="line-clamp-2 text-muted-foreground line-through">
          {before}
        </p>
        <p className="line-clamp-3 font-medium">{after}</p>
      </div>
    );
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5 break-words">
      <span className="text-muted-foreground">{before}</span>
      <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="font-semibold">{after}</span>
    </span>
  );
}

function AssigneeChange({
  added,
  removed,
  personName,
}: {
  added: number[];
  removed: number[];
  personName: (id: number) => string;
}) {
  return (
    <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
      {added.length > 0 && (
        <span>
          <span className="text-green-700 dark:text-green-400">+ Thêm </span>
          <span className="font-semibold">{added.map(personName).join(", ")}</span>
        </span>
      )}
      {removed.length > 0 && (
        <span>
          <span className="text-red-700 dark:text-red-400">− Bỏ </span>
          <span className="font-semibold">
            {removed.map(personName).join(", ")}
          </span>
        </span>
      )}
    </span>
  );
}

function BoardCard({
  item,
  actorName,
  format,
  renderTask,
}: {
  item: Activity;
  actorName: (item: Activity) => string;
  format: FormatFn;
  renderTask?: (item: Activity) => ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const changed = changedKeys(item);
  const snapshot = item.after ?? item.before;
  const completed = isCompletion(item);

  return (
    <li
      className={cn(
        "overflow-hidden rounded-xl border bg-background shadow-xs",
        completed &&
          "border-green-400 shadow-md shadow-green-500/10 ring-1 ring-green-500/30 dark:border-green-700",
      )}
    >
      <div
        className={cn(
          "flex flex-wrap items-center gap-2 border-b bg-muted/30 px-3 py-2 text-xs text-muted-foreground",
          completed &&
            "border-green-200 bg-linear-to-r from-green-50 to-transparent dark:border-green-900 dark:from-green-950/60",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "size-2 rounded-full",
            completed
              ? "bg-green-500 ring-4 ring-green-500/20"
              : item.action === "created"
              ? "bg-green-500"
              : item.action === "deleted"
                ? "bg-red-500"
                : "bg-primary",
          )}
        />
        <ActionBadge item={item} changed={changed} />
        {renderTask?.(item)}
        <time dateTime={item.createdAt}>
          {timeOf(item.createdAt)}{" "}
          {new Date(item.createdAt).toLocaleDateString("vi-VN")}
        </time>
        <span>· {actorName(item)}</span>
      </div>

      {snapshot && (
        <dl className="grid grid-cols-1 gap-px bg-border sm:grid-cols-2">
          {fields.map(({ key, label, icon: Icon, tone }) => {
            const isChanged = changed.includes(key);
            const isCompletedCell = completed && statusKeys.includes(key);
            const value = format(key, snapshot[key], snapshot);
            const isDescription = key === "description";
            return (
              <div
                key={key}
                className={cn(
                  "flex gap-2.5 bg-background px-3 py-2",
                  isDescription && "sm:col-span-2",
                  isCompletedCell
                    ? "bg-green-50 dark:bg-green-950/40"
                    : isChanged && "bg-amber-50 dark:bg-amber-950/40",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md text-white",
                    tone,
                  )}
                >
                  <Icon className="size-3.5" />
                </span>
                <div className="min-w-0 flex-1 text-sm">
                  <dt className="text-xs text-muted-foreground">
                    {label}
                    {isChanged && (
                      <span
                        className={cn(
                          "ml-1.5 font-medium",
                          isCompletedCell
                            ? "text-green-700 dark:text-green-400"
                            : "text-amber-700 dark:text-amber-400",
                        )}
                      >
                        {isCompletedCell ? "· đã hoàn thành" : "· đã thay đổi"}
                      </span>
                    )}
                  </dt>
                  <dd className="break-words">
                    {isChanged && (
                      <span
                        className={cn(
                          "text-muted-foreground line-through",
                          isDescription
                            ? cn("block", !expanded && "line-clamp-2")
                            : "mr-1.5",
                        )}
                      >
                        {format(key, item.before?.[key], item.before)}
                      </span>
                    )}
                    {isChanged && !isDescription && (
                      <ArrowRight className="mr-1.5 inline size-3.5 text-muted-foreground" />
                    )}
                    <span
                      className={cn(
                        "font-semibold",
                        isCompletedCell && "text-green-700 dark:text-green-400",
                        isDescription && cn("block", !expanded && "line-clamp-3"),
                        item.action === "deleted" && "line-through",
                      )}
                    >
                      {value}
                    </span>
                    {isDescription && value.length > 160 && (
                      <button
                        type="button"
                        className="text-xs text-primary hover:underline"
                        onClick={() => setExpanded(!expanded)}
                      >
                        {expanded ? "Thu gọn" : "Xem thêm"}
                      </button>
                    )}
                  </dd>
                </div>
              </div>
            );
          })}
        </dl>
      )}
    </li>
  );
}
