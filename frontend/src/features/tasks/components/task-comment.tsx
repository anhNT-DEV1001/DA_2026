"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import {
  FileText,
  History,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ComboboxPicker } from "@/components/common/combobox-picker";
import { Modal } from "@/components/common/modal";
import { DateTimePicker } from "@/components/common/datetime-picker";
import {
  RichTextContent,
  RichTextEditor,
} from "@/components/common/rich-text-editor";
import { useAuthStore } from "@/stores/auth-store";
import { MasterDataPicker } from "@/features/masterdata/components/masterdata-picker";
import {
  PRIORITY_GROUP,
  type Person,
  type Task,
  type TaskComment,
  type TaskInput,
  type TaskStatus,
} from "../types";
import {
  useAssignTask,
  useSaveTask,
  useTaskCommentMutation,
  useTaskComments,
  useTaskDetail,
  useUnassignTask,
} from "../hooks";
import { taskService } from "../services";
import { TaskError } from "./task-controls";
import { toISODate, toLocalDate } from "./task-dialog";
import { TaskHistory } from "./task-history";
import { PersonAvatar } from "./task-assignee-cell";

type Props = {
  workspaceId: number;
  taskId: number;
  statuses: TaskStatus[];
  people: Person[];
  names: Map<number, string>;
  canEdit: boolean;
  queryKey: readonly unknown[];
  onClose: () => void;
};

type Tab = "detail" | "comments" | "history";

const tabs = [
  { key: "detail", label: "Chi tiết", icon: FileText },
  { key: "comments", label: "Bình luận", icon: MessageSquare },
  { key: "history", label: "Lịch sử", icon: History },
] as const;

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Đã có lỗi xảy ra.";
}

/** Tải ảnh chèn vào mô tả / bình luận của task, trả về URL ảnh */
function imageUploader(workspaceId: number, taskId: number) {
  return (file: File) =>
    taskService.uploadImage(workspaceId, taskId, file).then((res) => res.url);
}

/** Drawer chi tiết task: tab chi tiết (form), bình luận và lịch sử */
export function TaskCommentDrawer(props: Props) {
  const detail = useTaskDetail(props.workspaceId, props.queryKey, props.taskId);
  const [tab, setTab] = useState<Tab>("detail");
  const [dirty, setDirty] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);

  function close() {
    if (dirty) setConfirmClose(true);
    else props.onClose();
  }

  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <SheetContent
        side="right"
        className="gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-2xl"
      >
        <SheetHeader className="gap-3 border-b pb-0 pr-12">
          {/* <div>
            <SheetTitle className="truncate">
              {detail.data?.title ?? "Chi tiết task"}
            </SheetTitle>
            <SheetDescription>
              Task #{props.taskId}
              {detail.data &&
                ` · ${props.statuses.find((s) => s.id === detail.data.statusId)?.name ?? ""}`}
            </SheetDescription>
          </div> */}
          <div role="tablist" aria-label="Chi tiết task" className="flex gap-1">
            {tabs.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
                className={cn(
                  "-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                  tab === key
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                {label}
                {key === "detail" && dirty && (
                  <span
                    className="size-1.5 rounded-full bg-amber-500"
                    title="Có thay đổi chưa lưu"
                  />
                )}
              </button>
            ))}
          </div>
        </SheetHeader>

        {/* Giữ form luôn mount để không mất bản nháp khi đổi tab */}
        <div
          role="tabpanel"
          hidden={tab !== "detail"}
          className="flex-1 overflow-y-auto"
        >
          {detail.isPending ? (
            <p role="status" className="p-4 text-sm text-muted-foreground">
              Đang tải task…
            </p>
          ) : detail.isError ? (
            <div className="p-4">
              <TaskError
                error={detail.error}
                retry={() => void detail.refetch()}
              />
            </div>
          ) : (
            <TaskDetailForm
              {...props}
              task={detail.data}
              onDirtyChange={setDirty}
            />
          )}
        </div>
        {tab === "comments" && <TaskComments {...props} />}
        {tab === "history" && (
          <div role="tabpanel" className="flex-1 overflow-y-auto p-4">
            <TaskHistory {...props} />
          </div>
        )}
      </SheetContent>

      <Modal
        open={confirmClose}
        onOpenChange={setConfirmClose}
        variant="warning"
        title="Bỏ thay đổi chưa lưu?"
        description="Các thay đổi trong tab Chi tiết chưa được lưu sẽ bị mất nếu bạn đóng."
        size="sm"
        cancelText="Tiếp tục chỉnh sửa"
        confirmText="Bỏ thay đổi"
        confirmVariant="destructive"
        onConfirm={() => {
          setConfirmClose(false);
          props.onClose();
        }}
      />
    </Sheet>
  );
}

/** Form chi tiết task: chỉ lưu khi nhấn "Lưu" */
function TaskDetailForm({
  task,
  onDirtyChange,
  ...props
}: Props & { task: Task; onDirtyChange: (dirty: boolean) => void }) {
  // Chỉ giữ các field đã sửa → field chưa sửa luôn hiển thị giá trị mới nhất từ server
  const [draft, setDraft] = useState<Partial<TaskInput>>({});
  const [assigneeDraft, setAssigneeDraft] = useState<number[] | null>(null);
  const [validation, setValidation] = useState("");
  const [saving, setSaving] = useState(false);
  const save = useSaveTask(props.workspaceId, props.queryKey);
  const assign = useAssignTask(props.workspaceId, props.queryKey);
  const unassign = useUnassignTask(props.workspaceId, props.queryKey);

  const base: TaskInput = {
    title: task.title,
    description: task.description,
    statusId: task.statusId,
    priority: task.priority,
    startDate: task.startDate,
    dueDate: task.dueDate,
  };
  const form = { ...base, ...draft };
  const assigneeIds = assigneeDraft ?? task.assigneeIds;

  const changed = Object.fromEntries(
    Object.entries(draft).filter(
      ([key, val]) => val !== base[key as keyof TaskInput],
    ),
  ) as Partial<TaskInput>;
  const toAdd = assigneeIds.filter((id) => !task.assigneeIds.includes(id));
  const toRemove = task.assigneeIds.filter((id) => !assigneeIds.includes(id));
  const dirty =
    Object.keys(changed).length > 0 || toAdd.length > 0 || toRemove.length > 0;

  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);

  function set(patch: Partial<TaskInput>) {
    setDraft((prev) => ({ ...prev, ...patch }));
  }

  function reset() {
    setDraft({});
    setAssigneeDraft(null);
    setValidation("");
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!dirty || saving) return;
    const title = form.title.trim();
    if (!title) {
      setValidation("Vui lòng nhập tiêu đề task.");
      return;
    }
    if (form.startDate && form.dueDate && form.startDate > form.dueDate) {
      setValidation("Ngày bắt đầu không được sau hạn hoàn thành.");
      return;
    }
    setValidation("");
    setSaving(true);
    try {
      const dto = { ...changed };
      if ("title" in dto) dto.title = title;
      if (Object.keys(dto).length)
        await save.mutateAsync({ taskId: task.id, dto });
      await Promise.all([
        ...toAdd.map((userId) =>
          assign.mutateAsync({ taskId: task.id, userId }),
        ),
        ...toRemove.map((userId) =>
          unassign.mutateAsync({ taskId: task.id, userId }),
        ),
      ]);
      reset();
      toast.add({ title: "Đã lưu task", type: "success" });
    } catch (error) {
      toast.add({
        title: "Không thể lưu task",
        description: errorMessage(error),
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  function onTitleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter") event.preventDefault();
  }

  const disabled = !props.canEdit || saving;

  // Giữ cả những người phụ trách cũ (vd: thành viên đã rời workspace)
  const assigneeItemsMap = new Map(props.people.map((p) => [p.id, p.name]));
  for (const id of [...task.assigneeIds, ...assigneeIds])
    if (!assigneeItemsMap.has(id))
      assigneeItemsMap.set(id, props.names.get(id) ?? `Người dùng #${id}`);
  const assigneeItems = [...assigneeItemsMap.entries()].map(([id, name]) => ({
    id,
    name,
  }));

  return (
    <form onSubmit={submit} className="flex min-h-full flex-col">
      {/* Thanh lưu cố định trên cùng khi cuộn (giống khung soạn ở tab bình luận) */}
      {props.canEdit && (
        <div className="sticky top-0 z-10 flex items-center justify-end gap-2 border-b bg-background px-4 py-3">
          {dirty && (
            <span className="mr-auto flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="size-1.5 rounded-full bg-amber-500" />
              Có thay đổi chưa lưu
            </span>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!dirty || saving}
            onClick={reset}
          >
            Hủy thay đổi
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={!dirty || saving || !props.statuses.length}
          >
            {saving ? "Đang lưu…" : "Lưu"}
          </Button>
        </div>
      )}
      <div className="flex-1 space-y-6 p-4">
        <textarea
          aria-label="Tiêu đề task"
          rows={1}
          maxLength={255}
          disabled={disabled}
          value={form.title}
          onChange={(e) => set({ title: e.target.value.replace(/\n/g, " ") })}
          onKeyDown={onTitleKeyDown}
          className="field-sizing-content w-full resize-none rounded-md border border-transparent bg-transparent px-2 py-1 -mx-2 text-xl font-semibold outline-none hover:border-border focus:border-ring focus:ring-2 focus:ring-ring/50 disabled:hover:border-transparent"
        />

        <dl className="grid gap-x-4 gap-y-3 text-sm sm:grid-cols-[8rem_1fr]">
          <dt className="self-center text-muted-foreground">Trạng thái</dt>
          <dd>
            <ComboboxPicker
              items={props.statuses.map((s) => ({ id: s.id, name: s.name }))}
              value={form.statusId ? String(form.statusId) : ""}
              onValueChange={(val) => {
                if (val) set({ statusId: Number(val) });
              }}
              placeholder="Chọn trạng thái"
              disabled={disabled}
              triggerClassName="h-9 w-full text-sm"
            />
          </dd>

          <dt className="self-center text-muted-foreground">Ưu tiên</dt>
          <dd>
            <MasterDataPicker
              group={PRIORITY_GROUP}
              value={form.priority}
              onValueChange={(val) => {
                if (val) set({ priority: val });
              }}
              placeholder="Chọn mức ưu tiên"
              disabled={disabled}
              triggerClassName="h-9 w-full text-sm"
            />
          </dd>

          <dt className="self-center text-muted-foreground">Người phụ trách</dt>
          <dd>
            <ComboboxPicker
              multiSelect
              items={assigneeItems}
              selectedValues={assigneeIds.map(String)}
              onSelectedValuesChange={(vals) =>
                setAssigneeDraft(vals.map(Number))
              }
              placeholder="Chọn người phụ trách"
              disabled={disabled}
              triggerClassName="h-9 w-full text-sm"
            />
          </dd>

          <dt className="self-center text-muted-foreground">Ngày bắt đầu</dt>
          <dd>
            <DateTimePicker
              mode="date"
              value={form.startDate}
              maxDate={toLocalDate(form.dueDate)}
              disabled={disabled}
              onChange={(date) => set({ startDate: toISODate(date) })}
            />
          </dd>

          <dt className="self-center text-muted-foreground">Hạn hoàn thành</dt>
          <dd>
            <DateTimePicker
              mode="date"
              value={form.dueDate}
              minDate={toLocalDate(form.startDate)}
              disabled={disabled}
              onChange={(date) => set({ dueDate: toISODate(date) })}
            />
          </dd>

          {task.completedAt && (
            <>
              <dt className="text-muted-foreground">Hoàn thành</dt>
              <dd>{new Date(task.completedAt).toLocaleString("vi-VN")}</dd>
            </>
          )}
        </dl>

        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Mô tả</h3>
          {!props.canEdit && !form.description ? (
            <p className="text-sm text-muted-foreground">Chưa có mô tả.</p>
          ) : (
            <RichTextEditor
              aria-label="Mô tả"
              value={form.description ?? ""}
              onChange={(html) => set({ description: html || null })}
              disabled={disabled}
              placeholder="Thêm mô tả cho task… (có thể dán hoặc kéo thả ảnh)"
              contentClassName="min-h-40"
              onUploadImage={imageUploader(props.workspaceId, task.id)}
            />
          )}
        </section>

        {validation && (
          <p role="alert" className="text-sm text-destructive">
            {validation}
          </p>
        )}
      </div>

    </form>
  );
}

function TaskComments(props: Props) {
  const comments = useTaskComments(
    props.workspaceId,
    props.queryKey,
    props.taskId,
  );
  const mutation = useTaskCommentMutation(
    props.workspaceId,
    props.queryKey,
    props.taskId,
  );
  const [content, setContent] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const now = useNow(30_000);
  const sending = mutation.isPending && mutation.variables?.type === "create";

  function submit() {
    if (!content || mutation.isPending) return;
    mutation.mutate(
      { type: "create", dto: { content } },
      {
        onSuccess: () => {
          setContent("");
          // Bình luận mới nằm trên cùng
          listRef.current?.scrollTo({ top: 0, behavior: "smooth" });
        },
        onError: (error) =>
          toast.add({
            title: "Không thể gửi bình luận",
            description: errorMessage(error),
            type: "error",
          }),
      },
    );
  }

  // API trả mới nhất trước → hiển thị mới nhất ở trên, ngay dưới khung soạn
  const items = comments.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div role="tabpanel" className="flex min-h-0 flex-1 flex-col">
      <div className="border-b bg-background p-4">
        <RichTextEditor
          aria-label="Viết bình luận"
          value={content}
          onChange={setContent}
          disabled={sending}
          placeholder="Viết bình luận… (Enter để gửi, Ctrl + Enter để xuống dòng)"
          className="rounded-lg"
          contentClassName="min-h-16 max-h-60 overflow-y-auto"
          onUploadImage={imageUploader(props.workspaceId, props.taskId)}
          submitOnEnter
          onSubmit={submit}
          toolbarPosition="bottom"
          toolbarEnd={
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={!content || mutation.isPending}
              onClick={submit}
            >
              {sending ? "Đang gửi…" : "Bình luận"}
            </Button>
          }
        />
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto p-4">
        {comments.isPending ? (
          <p role="status" className="text-sm text-muted-foreground">
            Đang tải bình luận…
          </p>
        ) : comments.isError ? (
          <TaskError
            error={comments.error}
            retry={() => void comments.refetch()}
          />
        ) : !items.length ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Chưa có bình luận nào. Hãy là người đầu tiên!
          </p>
        ) : (
          <ol className="space-y-4">
            {items.map((comment, index) => (
              <CommentItem
                key={comment.id}
                {...props}
                comment={comment}
                mutation={mutation}
                now={now}
                isLast={index === items.length - 1}
              />
            ))}
          </ol>
        )}

        {comments.hasNextPage && (
          <div className="mt-4 flex justify-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={comments.isFetchingNextPage}
              onClick={() => void comments.fetchNextPage()}
            >
              {comments.isFetchingNextPage
                ? "Đang tải…"
                : "Xem bình luận cũ hơn"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/** Thời điểm hiện tại, cập nhật định kỳ để thời gian tương đối ("5 phút") tự đổi */
function useNow(intervalMs: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}

/** Thời gian tương đối dạng ngắn; quá 7 ngày thì hiện ngày */
function timeAgo(value: string, now: number) {
  const seconds = Math.max(0, Math.floor((now - Date.parse(value)) / 1000));
  if (seconds < 60) return "vừa xong";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} phút`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ngày`;
  return new Date(value).toLocaleDateString("vi-VN");
}

function CommentItem({
  comment,
  mutation,
  now,
  isLast,
  ...props
}: Props & {
  comment: TaskComment;
  mutation: ReturnType<typeof useTaskCommentMutation>;
  now: number;
  isLast: boolean;
}) {
  const userId = useAuthStore((s) => s.user?.id);
  const [editing, setEditing] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const name = comment.authorId
    ? comment.author?.fullName ||
      comment.author?.username ||
      props.names.get(comment.authorId) ||
      `Người dùng #${comment.authorId}`
    : "Người dùng đã xóa";
  const isOwn = comment.authorId !== null && comment.authorId === userId;
  const busy =
    mutation.isPending &&
    mutation.variables?.type !== "create" &&
    mutation.variables?.commentId === comment.id;

  function onError(title: string) {
    return (error: unknown) =>
      toast.add({ title, description: errorMessage(error), type: "error" });
  }

  function saveEdit() {
    if (!editing || busy) return;
    mutation.mutate(
      { type: "update", commentId: comment.id, content: editing },
      {
        onSuccess: () => setEditing(null),
        onError: onError("Không thể sửa bình luận"),
      },
    );
  }

  return (
    // Của mình: dòng thời gian + avatar ở bên phải; người khác: bên trái
    <li
      className={cn(
        "flex gap-3",
        isOwn ? "flex-row-reverse pl-6 sm:pl-12" : "pr-6 sm:pr-12",
      )}
    >
      <div className="relative flex w-7 shrink-0 justify-center">
        <span className="z-10 flex size-7 items-center justify-center rounded-md border bg-background text-muted-foreground">
          <MessageSquare className="size-3.5" />
        </span>
        {!isLast && (
          <span
            aria-hidden
            className="absolute top-7 -bottom-4 w-px bg-border"
          />
        )}
      </div>

      <article
        className={cn(
          "min-w-0 flex-1 rounded-lg border px-4 py-3",
          isOwn ? "border-primary/20 bg-primary/5" : "bg-card",
        )}
      >
        <header
          className={cn("flex items-center gap-2", isOwn && "flex-row-reverse")}
        >
          <PersonAvatar
            person={{
              id: comment.authorId ?? 0,
              name,
              avatar: comment.author?.avatar,
            }}
            className="shrink-0"
          />
          <p
            className={cn(
              "flex min-w-0 flex-wrap items-baseline gap-x-1.5 text-xs text-muted-foreground",
              isOwn && "flex-row-reverse",
            )}
          >
            <span className="truncate text-sm font-medium text-foreground">
              {name}
            </span>
            <span aria-hidden>•</span>
            <time
              dateTime={comment.createdAt}
              title={new Date(comment.createdAt).toLocaleString("vi-VN")}
            >
              {timeAgo(comment.createdAt, now)}
            </time>
            {comment.editedAt && (
              <span title={new Date(comment.editedAt).toLocaleString("vi-VN")}>
                (đã sửa)
              </span>
            )}
          </p>

          {isOwn && editing === null && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Tùy chọn bình luận"
                    className="mr-auto text-muted-foreground"
                    disabled={busy}
                  >
                    <MoreHorizontal />
                  </Button>
                }
              />
              <DropdownMenuContent align="start" className="min-w-32">
                <DropdownMenuItem onClick={() => setEditing(comment.content)}>
                  <Pencil /> Sửa
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setConfirming(true)}
                >
                  <Trash2 /> Xóa
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </header>

        {editing !== null ? (
          <div
            className="mt-3 space-y-2"
            onKeyDown={(e) => {
              if (e.key === "Escape" && !busy) {
                e.stopPropagation();
                setEditing(null);
              }
            }}
          >
            <RichTextEditor
              aria-label="Sửa bình luận"
              value={editing}
              onChange={setEditing}
              disabled={busy}
              autoFocus
              submitOnEnter
              onSubmit={saveEdit}
              onUploadImage={imageUploader(props.workspaceId, props.taskId)}
            />
            <div className="flex items-center justify-end gap-2">
              <span className="mr-auto text-xs text-muted-foreground">
                Enter để lưu · Esc để hủy
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => setEditing(null)}
              >
                Hủy
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={busy || !editing}
                onClick={saveEdit}
              >
                {busy ? "Đang lưu…" : "Lưu"}
              </Button>
            </div>
          </div>
        ) : (
          <div className={cn("mt-2", isOwn ? "pr-9" : "pl-9")}>
            <RichTextContent html={comment.content} />
          </div>
        )}

        <Modal
          open={confirming}
          onOpenChange={(open) => {
            if (!busy) setConfirming(open);
          }}
          variant="destructive"
          title="Xóa bình luận?"
          description="Bình luận sẽ bị xóa vĩnh viễn và không thể khôi phục."
          size="sm"
          cancelText="Hủy"
          confirmText="Xóa bình luận"
          isLoading={busy}
          onConfirm={() =>
            mutation.mutate(
              { type: "delete", commentId: comment.id },
              {
                onSuccess: () => setConfirming(false),
                onError: onError("Không thể xóa bình luận"),
              },
            )
          }
        />
      </article>
    </li>
  );
}
