"use client";

import { useState, type KeyboardEvent } from "react";
import {
  AlertCircle,
  FileText,
  Loader2,
  MessageSquareReply,
  MoreHorizontal,
  Pencil,
  RotateCw,
  SmilePlus,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { Modal } from "@/components/common/modal";
import { RichTextContent } from "@/components/common/rich-text-editor";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { chatService } from "../services";
import type { ChatMessage, ChatUser } from "../types";
import { ChatUserAvatar } from "./chat-avatar";
import {
  QUICK_REACTIONS,
  formatFileSize,
  formatFullTime,
  formatMessageTime,
  isImage,
} from "./chat-utils";

export type MessageItemProps = {
  message: ChatMessage;
  /** Tin đầu cụm (các tin liên tiếp của cùng người): hiện tên */
  groupStart?: boolean;
  /** Tin cuối cụm: hiện avatar và thời gian */
  groupEnd?: boolean;
  /** Hiện tên người gửi trên cụm tin của người khác (kênh, nhóm); chat 1-1 thì không cần */
  showAuthorName?: boolean;
  myId?: number;
  /** Owner workspace được xoá tin của người khác */
  canModerate?: boolean;
  members: ChatUser[];
  readOnly?: boolean;
  /** Không truyền: ẩn nút trả lời (vd: đang ở trong thread) */
  onReply?: (message: ChatMessage) => void;
  onToggleReaction: (message: ChatMessage, emoji: string) => void;
  onEdit: (message: ChatMessage, content: string) => Promise<unknown>;
  onDelete: (message: ChatMessage) => Promise<unknown>;
  onRetry: (message: ChatMessage) => void;
  onDiscard: (message: ChatMessage) => void;
};

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Chữ thuần: tự nhận link và tô đậm @tên của người được nhắc */
function MessageText({
  content,
  mentionNames,
  inverted,
}: {
  content: string;
  mentionNames: string[];
  /** Nằm trên nền màu chủ đạo (bong bóng của mình) */
  inverted: boolean;
}) {
  const names = [...mentionNames]
    .sort((a, b) => b.length - a.length)
    .map((n) => `@${escapeRegExp(n)}`);
  const pattern = new RegExp(
    `(https?:\\/\\/[^\\s<]+${names.length ? `|${names.join("|")}` : ""})`,
    "g",
  );
  const parts = content.split(pattern);
  return (
    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
      {parts.map((part, i) => {
        if (i % 2 === 0) return part;
        if (part.startsWith("@"))
          return (
            <span
              key={i}
              className={cn(
                "rounded px-0.5 font-semibold",
                inverted ? "bg-primary-foreground/20" : "bg-primary/10 text-primary",
              )}
            >
              {part}
            </span>
          );
        return (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "underline underline-offset-2 break-all",
              inverted ? "text-primary-foreground" : "text-primary",
            )}
          >
            {part}
          </a>
        );
      })}
    </p>
  );
}

function Attachments({
  message,
  alignEnd,
}: {
  message: ChatMessage;
  alignEnd: boolean;
}) {
  if (!message.attachments.length) return null;
  const images = message.attachments.filter((a) => isImage(a.mimeType));
  const files = message.attachments.filter((a) => !isImage(a.mimeType));
  return (
    <div className={cn("flex flex-col gap-1", alignEnd ? "items-end" : "items-start")}>
      {images.length > 0 && (
        <div className={cn("flex flex-wrap gap-1", alignEnd && "justify-end")}>
          {images.map((a) => (
            <a
              key={a.id}
              href={chatService.attachmentUrl(message.conversationId, a.id)}
              target="_blank"
              rel="noopener noreferrer"
              className="block overflow-hidden rounded-2xl border border-border"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- file riêng tư, tải qua API có kiểm tra quyền */}
              <img
                src={chatService.attachmentUrl(message.conversationId, a.id)}
                alt={a.originalName}
                loading="lazy"
                className="max-h-60 max-w-full object-cover sm:max-w-xs"
              />
            </a>
          ))}
        </div>
      )}
      {files.map((a) => (
        <a
          key={a.id}
          href={chatService.attachmentUrl(message.conversationId, a.id, true)}
          className="flex max-w-xs items-center gap-2.5 rounded-2xl border border-border bg-background px-3 py-2 text-sm hover:bg-muted"
        >
          <FileText className="size-5 shrink-0 text-primary" aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium">{a.originalName}</span>
            <span className="text-xs text-muted-foreground">
              {formatFileSize(a.size)}
            </span>
          </span>
        </a>
      ))}
    </div>
  );
}

function Reactions({
  message,
  myId,
  members,
  disabled,
  onToggle,
}: {
  message: ChatMessage;
  myId?: number;
  members: ChatUser[];
  disabled: boolean;
  onToggle: (emoji: string) => void;
}) {
  if (!message.reactions.length) return null;
  return (
    // Đè nhẹ lên mép dưới bong bóng như Messenger
    <div className="relative z-1 -mt-1.5 flex flex-wrap gap-1 px-2">
      {message.reactions.map((r) => {
        const mine = myId !== undefined && r.userIds.includes(myId);
        const who = r.userIds
          .map((id) => (id === myId ? "Bạn" : members.find((m) => m.id === id)?.fullName))
          .filter(Boolean)
          .join(", ");
        return (
          <button
            key={r.emoji}
            type="button"
            disabled={disabled}
            onClick={() => onToggle(r.emoji)}
            title={who}
            aria-pressed={mine}
            className={cn(
              "flex h-5 items-center gap-0.5 rounded-full border px-1.5 text-xs shadow-xs transition-colors disabled:cursor-default",
              mine
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border bg-card hover:bg-muted",
            )}
          >
            <span>{r.emoji}</span>
            {r.count > 1 && <span className="text-[11px] font-medium">{r.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function MessageItem({
  message,
  groupStart = true,
  groupEnd = true,
  showAuthorName = true,
  myId,
  canModerate = false,
  members,
  readOnly = false,
  onReply,
  onToggleReaction,
  onEdit,
  onDelete,
  onRetry,
  onDiscard,
}: MessageItemProps) {
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [reactOpen, setReactOpen] = useState(false);

  const isMine = message.authorId === myId;
  const pending = message.localStatus === "sending";
  const failed = message.localStatus === "failed";
  const local = pending || failed;
  const canAct = !readOnly && !local;
  const mentionNames = message.mentionUserIds
    .map((id) => members.find((m) => m.id === id)?.fullName)
    .filter((n): n is string => !!n);

  if (message.type === "SYSTEM")
    return (
      <div className="my-2 px-4 text-center text-xs text-muted-foreground">
        {message.content}
      </div>
    );

  const saveEdit = async () => {
    const content = editing?.trim() ?? "";
    if (!content && !message.attachments.length) return;
    if (content === message.content) return setEditing(null);
    setSaving(true);
    try {
      await onEdit(message, content);
      setEditing(null);
    } catch (error) {
      toast.add({
        title: "Không thể sửa tin nhắn",
        description: (error as Error).message,
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const onEditKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void saveEdit();
    }
    if (e.key === "Escape") {
      e.stopPropagation();
      setEditing(null);
    }
  };

  const confirmRemove = async () => {
    setDeleting(true);
    try {
      await onDelete(message);
      setConfirmDelete(false);
    } catch (error) {
      toast.add({
        title: "Không thể xóa tin nhắn",
        description: (error as Error).message,
        type: "error",
      });
    } finally {
      setDeleting(false);
    }
  };

  // Góc phía người gửi bo nhỏ khi nối với tin trước/sau trong cùng cụm
  const bubbleShape = isMine
    ? cn(!groupStart && "rounded-tr-md", !groupEnd && "rounded-br-md")
    : cn(!groupStart && "rounded-tl-md", !groupEnd && "rounded-bl-md");

  const actions = canAct && editing === null && (
    <div
      className={cn(
        "flex shrink-0 items-center gap-0.5 self-center opacity-0 transition-opacity",
        "group-hover:opacity-100 focus-within:opacity-100 has-[[data-popup-open]]:opacity-100",
        isMine ? "flex-row-reverse" : "flex-row",
      )}
    >
      <Popover open={reactOpen} onOpenChange={setReactOpen}>
        <PopoverTrigger
          render={
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label="Thả cảm xúc"
              title="Thả cảm xúc"
              className="rounded-full text-muted-foreground"
            >
              <SmilePlus />
            </Button>
          }
        />
        <PopoverContent side="top" align={isMine ? "end" : "start"} className="w-auto rounded-full p-1">
          <div className="flex gap-0.5">
            {QUICK_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  onToggleReaction(message, emoji);
                  setReactOpen(false);
                }}
                className="flex size-8 items-center justify-center rounded-full text-lg transition-transform hover:scale-125 hover:bg-muted"
                aria-label={`Thả ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
      {onReply && (
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          onClick={() => onReply(message)}
          aria-label="Trả lời trong thread"
          title="Trả lời trong thread"
          className="rounded-full text-muted-foreground"
        >
          <MessageSquareReply />
        </Button>
      )}
      {(isMine || canModerate) && (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label="Tùy chọn tin nhắn"
                className="rounded-full text-muted-foreground"
              >
                <MoreHorizontal />
              </Button>
            }
          />
          <DropdownMenuContent align={isMine ? "end" : "start"} className="min-w-32">
            {isMine && message.type === "TEXT" && (
              <DropdownMenuItem onClick={() => setEditing(message.content)}>
                <Pencil /> Sửa
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 /> Xóa
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );

  return (
    <div
      className={cn(
        "group flex w-full items-end gap-2 px-3",
        isMine ? "flex-row-reverse" : "flex-row",
        groupStart ? "mt-3" : "mt-0.5",
      )}
    >
      {!isMine && (
        <div className="w-7 shrink-0">
          {groupEnd && <ChatUserAvatar user={message.author} size="sm" className="size-7" />}
        </div>
      )}

      <div
        className={cn(
          "flex min-w-0 max-w-[85%] flex-col sm:max-w-[70%]",
          isMine ? "items-end" : "items-start",
          pending && "opacity-60",
        )}
      >
        {groupStart && !isMine && showAuthorName && (
          <span className="mb-0.5 px-3 text-xs text-muted-foreground">
            {message.author?.fullName ?? "Người dùng đã bị xóa"}
          </span>
        )}

        {editing !== null ? (
          <div className="w-72 max-w-full space-y-1.5 sm:w-96">
            <Textarea
              value={editing}
              autoFocus
              rows={2}
              disabled={saving}
              onChange={(e) => setEditing(e.target.value)}
              onKeyDown={onEditKeyDown}
              aria-label="Sửa tin nhắn"
              className="min-h-0 resize-none rounded-2xl text-sm"
            />
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Enter để lưu, Esc để hủy</span>
              <Button
                type="button"
                size="xs"
                variant="ghost"
                className="ml-auto"
                onClick={() => setEditing(null)}
                disabled={saving}
              >
                Hủy
              </Button>
              <Button type="button" size="xs" onClick={saveEdit} disabled={saving}>
                {saving && <Loader2 className="animate-spin" />} Lưu
              </Button>
            </div>
          </div>
        ) : (
          <div className={cn("flex max-w-full items-center gap-1", isMine ? "flex-row-reverse" : "flex-row")}>
            <div className={cn("flex min-w-0 flex-col gap-1", isMine ? "items-end" : "items-start")}>
              {message.content && (
                <div
                  title={formatFullTime(message.createdAt)}
                  className={cn(
                    "max-w-full rounded-2xl px-3 py-2",
                    isMine
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground",
                    failed && "bg-destructive/15 text-foreground",
                    bubbleShape,
                  )}
                >
                  {message.contentType === "html" ? (
                    <RichTextContent html={message.content} className="text-sm" />
                  ) : (
                    <MessageText
                      content={message.content}
                      mentionNames={mentionNames}
                      inverted={isMine && !failed}
                    />
                  )}
                </div>
              )}
              <Attachments message={message} alignEnd={isMine} />
            </div>
            {actions}
          </div>
        )}

        <Reactions
          message={message}
          myId={myId}
          members={members}
          disabled={!canAct}
          onToggle={(emoji) => onToggleReaction(message, emoji)}
        />

        {onReply && message.replyCount > 0 && (
          <button
            type="button"
            onClick={() => onReply(message)}
            className="mt-1 flex items-center gap-1.5 px-2 text-xs font-medium text-primary hover:underline"
          >
            <MessageSquareReply className="size-3.5" aria-hidden="true" />
            {message.replyCount} câu trả lời
          </button>
        )}

        {failed ? (
          <div className="mt-1 flex items-center gap-2 px-1 text-xs text-destructive">
            <AlertCircle className="size-3.5" aria-hidden="true" />
            Không gửi được.
            <button
              type="button"
              onClick={() => onRetry(message)}
              className="flex items-center gap-1 font-medium hover:underline"
            >
              <RotateCw className="size-3" aria-hidden="true" /> Gửi lại
            </button>
            <button
              type="button"
              onClick={() => onDiscard(message)}
              className="flex items-center gap-1 text-muted-foreground hover:underline"
            >
              <X className="size-3" aria-hidden="true" /> Bỏ
            </button>
          </div>
        ) : (
          (groupEnd || message.editedAt) && (
            <span className="mt-0.5 px-2 text-[11px] text-muted-foreground">
              {pending ? (
                "Đang gửi..."
              ) : (
                <>
                  {groupEnd && (
                    <time dateTime={message.createdAt} title={formatFullTime(message.createdAt)}>
                      {formatMessageTime(message.createdAt)}
                    </time>
                  )}
                  {message.editedAt && (
                    <span title={formatFullTime(message.editedAt)}>
                      {groupEnd && " · "}đã chỉnh sửa
                    </span>
                  )}
                </>
              )}
            </span>
          )
        )}
      </div>

      <Modal
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        variant="destructive"
        icon={<Trash2 />}
        title="Xóa tin nhắn?"
        description={
          isMine
            ? "Tin nhắn sẽ bị xóa với mọi người trong cuộc trò chuyện."
            : "Bạn đang xóa tin nhắn của người khác với quyền chủ sở hữu workspace."
        }
        confirmText="Xóa"
        cancelText="Hủy"
        onConfirm={confirmRemove}
        isLoading={deleting}
        size="sm"
      />
    </div>
  );
}
