"use client";

import { useEffect, useRef } from "react";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMessageReplies } from "../hooks";
import type { ChatMessage } from "../types";
import { MessageComposer } from "./message-composer";
import { MessageItem, type MessageItemProps } from "./message-item";
import { isGroupedWith } from "./chat-utils";

type Props = Omit<MessageItemProps, "message" | "groupStart" | "groupEnd" | "onReply"> & {
  conversationId: number;
  parent: ChatMessage;
  onClose: () => void;
};

/** Trả lời trong thread của một tin gốc */
export function ThreadPanel({ conversationId, parent, onClose, ...itemProps }: Props) {
  const { replies, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useMessageReplies(conversationId, parent.id);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Trả lời mới (của mình hoặc người khác) → cuộn xuống cuối thread
  const lastReplyId = replies.at(-1)?.id;
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lastReplyId]);

  return (
    <aside
      className="flex h-full min-h-0 w-full flex-col border-l border-border bg-card lg:w-96"
      aria-label="Thread"
    >
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold">Thread</h3>
          <p className="truncate text-xs text-muted-foreground">
            {parent.replyCount} câu trả lời
          </p>
        </div>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          onClick={onClose}
          aria-label="Đóng thread"
        >
          <X />
        </Button>
      </header>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto py-2">
        <MessageItem message={parent} {...itemProps} />
        <div className="my-2 flex items-center gap-3 px-4">
          <span className="text-xs text-muted-foreground">
            {parent.replyCount ? `${parent.replyCount} câu trả lời` : "Chưa có câu trả lời"}
          </span>
          <span className="h-px flex-1 bg-border" />
        </div>
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          </div>
        ) : (
          replies.map((reply, i) => (
            <MessageItem
              key={reply.clientMessageId ?? reply.id}
              message={reply}
              groupStart={!isGroupedWith(reply, replies[i - 1])}
              groupEnd={!isGroupedWith(replies[i + 1], reply)}
              {...itemProps}
            />
          ))
        )}
        {hasNextPage && (
          <div className="flex justify-center py-2">
            <Button
              type="button"
              size="xs"
              variant="ghost"
              onClick={() => void fetchNextPage()}
              disabled={isFetchingNextPage}
            >
              {isFetchingNextPage && <Loader2 className="animate-spin" />} Xem thêm câu trả lời
            </Button>
          </div>
        )}
      </div>

      <MessageComposer
        key={parent.id}
        conversationId={conversationId}
        parentId={parent.id}
        members={itemProps.members}
        myId={itemProps.myId}
        disabled={itemProps.readOnly}
        placeholder="Trả lời..."
        autoFocus
      />
    </aside>
  );
}
