"use client";

import { Fragment, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowDown, Loader2, MessagesSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { ChatMessage } from "../types";
import { MessageItem, type MessageItemProps } from "./message-item";
import { formatDayLabel, isGroupedWith, startsNewDay } from "./chat-utils";

// Cách đáy ít hơn khoảng này thì coi như đang xem tin mới nhất
const NEAR_BOTTOM_PX = 120;

type Props = Omit<MessageItemProps, "message" | "groupStart" | "groupEnd"> & {
  /** Đổi conversation → cuộn xuống cuối như mở mới */
  conversationId: number;
  /** Cũ → mới */
  messages: ChatMessage[];
  isLoading: boolean;
  hasOlder: boolean;
  isFetchingOlder: boolean;
  fetchOlder: () => void;
  emptyText?: string;
};

export function MessageList({
  conversationId,
  messages,
  isLoading,
  hasOlder,
  isFetchingOlder,
  fetchOlder,
  emptyText = "Chưa có tin nhắn nào. Hãy gửi lời chào!",
  ...itemProps
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
  // Chiều cao trước khi chèn tin cũ lên đầu, để giữ nguyên vị trí đang đọc
  const heightBeforeOlder = useRef<number | null>(null);
  const lastId = useRef<number | undefined>(undefined);
  const [showJump, setShowJump] = useState(false);

  const scrollToBottom = (smooth = false) => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  };

  // Mở conversation khác: bắt đầu ở cuối
  useEffect(() => {
    nearBottom.current = true;
    lastId.current = undefined;
    heightBeforeOlder.current = null;
  }, [conversationId]);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (heightBeforeOlder.current !== null) {
      el.scrollTop += el.scrollHeight - heightBeforeOlder.current;
      heightBeforeOlder.current = null;
      return;
    }
    const newest = messages.at(-1);
    if (newest?.id === lastId.current) return;
    const isFirstRender = lastId.current === undefined;
    lastId.current = newest?.id;
    // Tin mới: theo xuống nếu đang ở cuối hoặc chính mình gửi
    if (isFirstRender || nearBottom.current || newest?.authorId === itemProps.myId)
      scrollToBottom(!isFirstRender);
    else setShowJump(true);
  }, [messages, itemProps.myId]);

  // Cuộn tới đầu danh sách → tải tin cũ hơn
  useEffect(() => {
    const el = topRef.current;
    if (!el || !hasOlder) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || isFetchingOlder) return;
        heightBeforeOlder.current = scrollRef.current?.scrollHeight ?? null;
        fetchOlder();
      },
      { root: scrollRef.current, rootMargin: "200px 0px 0px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasOlder, isFetchingOlder, fetchOlder]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    nearBottom.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
    if (nearBottom.current) setShowJump(false);
  };

  return (
    <div className="relative min-h-0 flex-1">
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="h-full overflow-y-auto py-3"
        role="log"
        aria-live="polite"
        aria-label="Tin nhắn"
      >
        {isLoading ? (
          <div className="space-y-4 px-4">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="size-8 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-muted-foreground">
            <MessagesSquare className="size-10 opacity-40" aria-hidden="true" />
            <p className="text-sm">{emptyText}</p>
          </div>
        ) : (
          <>
            <div ref={topRef} className="h-px" />
            {isFetchingOlder && (
              <div className="flex justify-center py-2">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              </div>
            )}
            {!hasOlder && (
              <p className="px-4 pb-2 pt-4 text-center text-xs text-muted-foreground">
                Bắt đầu cuộc trò chuyện
              </p>
            )}
            {messages.map((message, i) => {
              const previous = messages[i - 1];
              return (
                <Fragment key={message.clientMessageId ?? message.id}>
                  {startsNewDay(message, previous) && (
                    <div className="my-3 flex items-center gap-3 px-4" role="separator">
                      <span className="h-px flex-1 bg-border" />
                      <span className="text-xs font-medium capitalize text-muted-foreground">
                        {formatDayLabel(message.createdAt)}
                      </span>
                      <span className="h-px flex-1 bg-border" />
                    </div>
                  )}
                  <MessageItem
                    message={message}
                    groupStart={!isGroupedWith(message, previous)}
                    groupEnd={!isGroupedWith(messages[i + 1], message)}
                    {...itemProps}
                  />
                </Fragment>
              );
            })}
          </>
        )}
      </div>

      {showJump && (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => {
            scrollToBottom(true);
            setShowJump(false);
          }}
          className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full shadow-md"
        >
          <ArrowDown /> Tin nhắn mới
        </Button>
      )}
    </div>
  );
}
