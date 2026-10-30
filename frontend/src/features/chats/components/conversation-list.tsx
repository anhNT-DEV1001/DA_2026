"use client";

import { useMemo, useState } from "react";
import {
  Bell,
  BellOff,
  MoreHorizontal,
  Pin,
  PinOff,
  Plus,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useConversationActions } from "../hooks";
import type { Conversation } from "../types";
import { ConversationAvatar } from "./chat-avatar";
import { conversationName, formatShortTime } from "./chat-utils";

type Props = {
  conversations: Conversation[];
  isLoading: boolean;
  activeId: number | null;
  myId?: number;
  onSelect: (id: number) => void;
  onNewDirect: () => void;
};

export function ConversationList({
  conversations,
  isLoading,
  activeId,
  myId,
  onSelect,
  onNewDirect,
}: Props) {
  const [search, setSearch] = useState("");

  const { channels, directs } = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    const matched = keyword
      ? conversations.filter((c) =>
          conversationName(c, myId).toLowerCase().includes(keyword),
        )
      : conversations;
    return {
      channels: matched.filter((c) => c.type !== "DIRECT"),
      directs: matched.filter((c) => c.type === "DIRECT"),
    };
  }, [conversations, search, myId]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 border-b border-border p-3">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm cuộc trò chuyện"
            aria-label="Tìm cuộc trò chuyện"
            className="h-9 pl-8"
          />
        </div>
        <Button
          type="button"
          size="icon"
          variant="outline"
          onClick={onNewDirect}
          aria-label="Tạo tin nhắn riêng"
          title="Tạo tin nhắn riêng"
        >
          <Plus />
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <div className="space-y-2 p-1">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="flex items-center gap-3 p-2">
                <Skeleton className="size-8 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <Section
              title="Kênh"
              items={channels}
              activeId={activeId}
              myId={myId}
              onSelect={onSelect}
            />
            <Section
              title=""
              items={directs}
              activeId={activeId}
              myId={myId}
              onSelect={onSelect}
              empty={
                search ? undefined : (
                  <button
                    type="button"
                    onClick={onNewDirect}
                    className="w-full rounded-md px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted"
                  >
                    + Bắt đầu trò chuyện với đồng nghiệp
                  </button>
                )
              }
            />
            {search && !channels.length && !directs.length && (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                Không tìm thấy cuộc trò chuyện nào
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Section({
  title,
  items,
  activeId,
  myId,
  onSelect,
  empty,
}: {
  title: string;
  items: Conversation[];
  activeId: number | null;
  myId?: number;
  onSelect: (id: number) => void;
  empty?: React.ReactNode;
}) {
  if (!items.length && !empty) return null;
  return (
    <section className="mb-3">
      <h3 className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      {items.length ? (
        <ul className="space-y-0.5">
          {items.map((c) => (
            <li key={c.id}>
              <ConversationRow
                conversation={c}
                active={c.id === activeId}
                myId={myId}
                onSelect={onSelect}
              />
            </li>
          ))}
        </ul>
      ) : (
        empty
      )}
    </section>
  );
}

function ConversationRow({
  conversation: c,
  active,
  myId,
  onSelect,
}: {
  conversation: Conversation;
  active: boolean;
  myId?: number;
  onSelect: (id: number) => void;
}) {
  const unread = c.unreadCount > 0 && !active;
  const author =
    c.lastMessage?.authorId === myId
      ? "Bạn: "
      : c.type !== "DIRECT" && c.lastMessage?.author
        ? `${c.lastMessage.author.fullName}: `
        : "";
  return (
    <div
      className={cn(
        "group/conv relative rounded-lg transition-colors",
        active ? "bg-primary/10" : "hover:bg-muted",
      )}
    >
      <button
        type="button"
        onClick={() => onSelect(c.id)}
        aria-current={active ? "true" : undefined}
        className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left"
      >
        <ConversationAvatar conversation={c} myId={myId} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span
              className={cn(
                "truncate text-sm",
                unread ? "font-semibold text-foreground" : "font-medium",
                c.archivedAt && "text-muted-foreground line-through",
              )}
            >
              {conversationName(c, myId)}
            </span>
            {c.pinned && (
              <Pin
                className="size-3 shrink-0 text-muted-foreground"
                aria-label="Đã ghim"
              />
            )}
            {c.muted && (
              <BellOff
                className="size-3 shrink-0 text-muted-foreground"
                aria-label="Đã tắt thông báo"
              />
            )}
            {/* Nhường chỗ cho nút ⋯ khi rê chuột / đang mở menu */}
            <span className="ml-auto shrink-0 text-[11px] text-muted-foreground group-hover/conv:invisible group-focus-within/conv:invisible group-has-[[data-popup-open]]/conv:invisible">
              {formatShortTime(c.lastMessage?.createdAt ?? c.lastMessageAt)}
            </span>
          </span>
          <span className="flex items-center gap-2">
            <span
              className={cn(
                "truncate text-xs",
                unread ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {c.lastMessage
                ? `${author}${c.lastMessage.preview || "Đã gửi file đính kèm"}`
                : "Chưa có tin nhắn"}
            </span>
            {unread && (
              <span
                className={cn(
                  "ml-auto flex h-4.5 min-w-4.5 shrink-0 items-center justify-center rounded-full px-1 text-[10px] font-semibold",
                  c.muted
                    ? "bg-muted-foreground/30 text-foreground"
                    : "bg-primary text-primary-foreground",
                )}
                aria-label={`${c.unreadCount} tin chưa đọc`}
              >
                {c.unreadCount > 99 ? "99+" : c.unreadCount}
              </span>
            )}
          </span>
        </span>
      </button>
      <ConversationMenu conversation={c} />
    </div>
  );
}

/** Ghim / tắt thông báo cho từng cuộc trò chuyện */
function ConversationMenu({ conversation: c }: { conversation: Conversation }) {
  const { togglePin, toggleMute } = useConversationActions(c.id);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            aria-label="Tùy chọn cuộc trò chuyện"
            className="absolute right-1.5 top-1.5 bg-background/80 text-muted-foreground opacity-0 shadow-xs transition-opacity hover:text-foreground focus-visible:opacity-100 group-hover/conv:opacity-100 data-popup-open:opacity-100"
          >
            <MoreHorizontal />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuItem onClick={() => togglePin(!c.pinned)}>
          {c.pinned ? <PinOff /> : <Pin />}
          {c.pinned ? "Bỏ ghim" : "Ghim lên đầu"}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => toggleMute(!c.muted)}>
          {c.muted ? <Bell /> : <BellOff />}
          {c.muted ? "Bật thông báo" : "Tắt thông báo"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
