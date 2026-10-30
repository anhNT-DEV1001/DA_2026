"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type DragEvent,
  type KeyboardEvent,
} from "react";
import { FileText, Loader2, Paperclip, SendHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { useSendMessage, useUploadAttachment } from "../hooks";
import {
  MAX_MESSAGE_LENGTH,
  type ChatMessage,
  type ChatUser,
  type UploadedAttachment,
} from "../types";
import { ChatUserAvatar } from "./chat-avatar";
import { formatFileSize, isImage } from "./chat-utils";

const MAX_ATTACHMENTS = 10;
const MAX_TEXTAREA_HEIGHT = 200;
// "@abc" ngay trước con trỏ (đầu dòng hoặc sau khoảng trắng)
const MENTION_QUERY = /(?:^|\s)@([^\s@]{0,30})$/;

type PendingFile = {
  key: string;
  file: File;
  previewUrl?: string;
  uploaded?: UploadedAttachment;
  failed?: boolean;
};

type Props = {
  conversationId: number;
  parentId?: number;
  members: ChatUser[];
  myId?: number;
  disabled?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
  onTyping?: () => void;
  onStopTyping?: () => void;
  onSent?: (message: ChatMessage) => void;
};

export function MessageComposer({
  conversationId,
  parentId,
  members,
  myId,
  disabled = false,
  placeholder = "Nhập tin nhắn...",
  autoFocus = false,
  onTyping,
  onStopTyping,
  onSent,
}: Props) {
  const [text, setText] = useState("");
  const [files, setFiles] = useState<PendingFile[]>([]);
  // userId → tên đã chèn; khi gửi chỉ giữ người còn "@tên" trong nội dung
  const [mentions, setMentions] = useState<Map<number, string>>(new Map());
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [dragging, setDragging] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { send } = useSendMessage(conversationId);
  const upload = useUploadAttachment(conversationId);

  const uploading = files.some((f) => !f.uploaded && !f.failed);
  const canSend =
    !disabled && !uploading && (text.trim().length > 0 || files.some((f) => f.uploaded));

  const suggestions = useMemo(() => {
    if (mentionQuery === null) return [];
    const q = mentionQuery.toLowerCase();
    return members
      .filter(
        (m) =>
          m.id !== myId &&
          (m.fullName.toLowerCase().includes(q) || m.username.toLowerCase().includes(q)),
      )
      .slice(0, 6);
  }, [mentionQuery, members, myId]);

  // Tự giãn chiều cao theo nội dung
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
  }, [text]);

  // Thu hồi URL xem trước ảnh khi bỏ file / rời composer
  const previewUrls = useRef(new Set<string>());
  useEffect(() => {
    const urls = previewUrls.current;
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const reset = () => {
    setText("");
    setFiles((current) => {
      current.forEach((f) => f.previewUrl && URL.revokeObjectURL(f.previewUrl));
      return [];
    });
    setMentions(new Map());
    setMentionQuery(null);
  };

  const addFiles = (list: FileList | File[]) => {
    const incoming = Array.from(list).slice(0, MAX_ATTACHMENTS - files.length);
    if (list.length > incoming.length)
      toast.add({
        title: `Tối đa ${MAX_ATTACHMENTS} file mỗi tin nhắn`,
        type: "warning",
      });
    for (const file of incoming) {
      const key = `${file.name}-${file.size}-${Math.random()}`;
      const previewUrl = isImage(file.type) ? URL.createObjectURL(file) : undefined;
      if (previewUrl) previewUrls.current.add(previewUrl);
      setFiles((current) => [...current, { key, file, previewUrl }]);
      upload
        .mutateAsync(file)
        .then((uploaded) =>
          setFiles((current) =>
            current.map((f) => (f.key === key ? { ...f, uploaded } : f)),
          ),
        )
        .catch((error: Error) => {
          setFiles((current) =>
            current.map((f) => (f.key === key ? { ...f, failed: true } : f)),
          );
          toast.add({
            title: `Không tải lên được "${file.name}"`,
            description: error.message,
            type: "error",
          });
        });
    }
  };

  const removeFile = (key: string) =>
    setFiles((current) => {
      const target = current.find((f) => f.key === key);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return current.filter((f) => f.key !== key);
    });

  const submit = () => {
    if (!canSend) return;
    const content = text.trim();
    const mentionUserIds = [...mentions]
      .filter(([, name]) => content.includes(`@${name}`))
      .map(([id]) => id);
    const attachmentIds = files.flatMap((f) => (f.uploaded ? [f.uploaded.id] : []));
    reset();
    onStopTyping?.();
    send({
      content,
      contentType: "text",
      parentId: parentId ?? null,
      mentionUserIds,
      attachmentIds,
    })
      .then((message) => onSent?.(message))
      // Tin đã chuyển sang trạng thái "failed" kèm nút gửi lại
      .catch(() => undefined);
    textareaRef.current?.focus();
  };

  const updateMentionQuery = (value: string, caret: number) => {
    const match = MENTION_QUERY.exec(value.slice(0, caret));
    setMentionQuery(match ? match[1] : null);
    setMentionIndex(0);
  };

  const onChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setText(value);
    updateMentionQuery(value, e.target.selectionStart);
    if (value.trim()) onTyping?.();
    else onStopTyping?.();
  };

  const chooseMention = (user: ChatUser) => {
    const el = textareaRef.current;
    const caret = el?.selectionStart ?? text.length;
    const before = text.slice(0, caret).replace(/@([^\s@]{0,30})$/, `@${user.fullName} `);
    const next = before + text.slice(caret);
    setText(next);
    setMentions((current) => new Map(current).set(user.id, user.fullName));
    setMentionQuery(null);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(before.length, before.length);
    });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (suggestions.length) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const step = e.key === "ArrowDown" ? 1 : -1;
        setMentionIndex((i) => (i + step + suggestions.length) % suggestions.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        chooseMention(suggestions[mentionIndex]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setMentionQuery(null);
        return;
      }
    }
    // Đang gõ tiếng Việt bằng bộ gõ (IME): Enter chỉ để chốt chữ
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  const onPaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    if (e.clipboardData.files.length) {
      e.preventDefault();
      addFiles(e.clipboardData.files);
    }
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    if (!disabled && e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  };

  if (disabled)
    return (
      <div className="border-t border-border px-4 py-3 text-center text-sm text-muted-foreground">
        Cuộc trò chuyện đã được lưu trữ, bạn chỉ có thể xem lại tin nhắn.
      </div>
    );

  return (
    <div
      className="relative border-t border-border p-3"
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      {suggestions.length > 0 && (
        <ul
          role="listbox"
          aria-label="Gợi ý người được nhắc"
          className="absolute bottom-full left-3 right-3 z-10 mb-1 max-w-sm overflow-hidden rounded-lg border border-border bg-popover p-1 shadow-lg"
        >
          {suggestions.map((user, i) => (
            <li key={user.id} role="option" aria-selected={i === mentionIndex}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => chooseMention(user)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm",
                  i === mentionIndex ? "bg-accent text-accent-foreground" : "hover:bg-muted",
                )}
              >
                <ChatUserAvatar user={user} size="sm" />
                <span className="truncate font-medium">{user.fullName}</span>
                <span className="truncate text-xs text-muted-foreground">@{user.username}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div
        className={cn(
          "rounded-xl border border-input bg-background transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30",
          dragging && "border-primary bg-primary/5",
        )}
      >
        {files.length > 0 && (
          <div className="flex flex-wrap gap-2 border-b border-border p-2">
            {files.map((f) => (
              <div
                key={f.key}
                className={cn(
                  "relative flex h-14 items-center gap-2 rounded-lg border border-border bg-muted/40 pr-7",
                  f.previewUrl ? "w-14 justify-center pr-0" : "max-w-52 pl-2",
                  f.failed && "border-destructive/50",
                )}
              >
                {f.previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- ảnh xem trước từ blob: URL
                  <img src={f.previewUrl} alt={f.file.name} className="size-full rounded-lg object-cover" />
                ) : (
                  <>
                    <FileText className="size-5 shrink-0 text-primary" aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-medium">{f.file.name}</span>
                      <span className="text-[11px] text-muted-foreground">
                        {f.failed ? "Lỗi tải lên" : formatFileSize(f.file.size)}
                      </span>
                    </span>
                  </>
                )}
                {!f.uploaded && !f.failed && (
                  <span className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/60">
                    <Loader2 className="size-4 animate-spin" aria-label="Đang tải lên" />
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => removeFile(f.key)}
                  aria-label={`Bỏ ${f.file.name}`}
                  className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm hover:text-foreground"
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end gap-1 p-1.5">
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            onClick={() => fileInputRef.current?.click()}
            disabled={files.length >= MAX_ATTACHMENTS}
            aria-label="Đính kèm file"
            title="Đính kèm file (có thể dán hoặc kéo thả)"
            className="mb-0.5 text-muted-foreground"
          >
            <Paperclip />
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            hidden
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <textarea
            ref={textareaRef}
            value={text}
            rows={1}
            autoFocus={autoFocus}
            maxLength={MAX_MESSAGE_LENGTH}
            placeholder={placeholder}
            aria-label={placeholder}
            onChange={onChange}
            onKeyDown={onKeyDown}
            onPaste={onPaste}
            onBlur={() => {
              setMentionQuery(null);
              onStopTyping?.();
            }}
            onClick={(e) => updateMentionQuery(text, e.currentTarget.selectionStart)}
            className="max-h-50 min-h-8 flex-1 resize-none bg-transparent px-1.5 py-1.5 text-sm outline-none placeholder:text-muted-foreground"
          />
          <Button
            type="button"
            size="icon-sm"
            onClick={submit}
            disabled={!canSend}
            aria-label="Gửi"
            title={uploading ? "Đang tải file lên..." : "Gửi (Enter)"}
            className="mb-0.5"
          >
            <SendHorizontal />
          </Button>
        </div>
      </div>
      <p className="mt-1 hidden px-1 text-[11px] text-muted-foreground sm:block">
        Enter để gửi · Shift + Enter để xuống dòng · @ để nhắc tên
      </p>
    </div>
  );
}
