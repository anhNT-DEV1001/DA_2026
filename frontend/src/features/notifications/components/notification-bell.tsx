"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { Bell, CheckCheck, Loader2, Trash2, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  useNotificationActions,
  useNotificationCount,
  useNotificationList,
  useNotificationRealtime,
} from "../hooks";
import type { NotificationItem } from "../types";

/** Đường dẫn khi bấm vào thông báo (dựa trên snapshot data từ backend) */
function getNotificationHref(item: NotificationItem): string | null {
  const slug = item.data?.workspaceSlug;
  if (item.entityType === "workspace" && typeof slug === "string") {
    return `/workspaces/${slug}`;
  }
  return null;
}

function formatBadge(count: number) {
  return count > 99 ? "99+" : String(count);
}

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [unreadOnly, setUnreadOnly] = React.useState(false);

  useNotificationRealtime();
  const { unseenCount, unreadCount } = useNotificationCount();
  const {
    notifications,
    isLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useNotificationList({ unreadOnly, enabled: open });
  const {
    markAllSeen,
    markRead,
    markAllRead,
    isMarkingAllRead,
    remove,
    removeAll,
    isRemovingAll,
  } = useNotificationActions();
  // Bước xác nhận trước khi ẩn tất cả
  const [confirmingClear, setConfirmingClear] = React.useState(false);

  const handleRemoveAll = () => {
    removeAll(undefined, { onSettled: () => setConfirmingClear(false) });
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setConfirmingClear(false);
    // Mở danh sách thì coi như đã xem -> reset badge
    if (next && unseenCount > 0) markAllSeen();
  };

  const handleItemClick = (item: NotificationItem) => {
    if (!item.readAt) markRead(item.id);
    const href = getNotificationHref(item);
    if (href) {
      setOpen(false);
      router.push(href);
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    if (nearBottom && hasNextPage && !isFetchingNextPage) fetchNextPage();
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            className="size-8 text-muted-foreground hover:text-foreground relative cursor-pointer"
            title="Thông báo"
          >
            <Bell className="size-4" />
            {unseenCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-white">
                {formatBadge(unseenCount)}
              </span>
            )}
            <span className="sr-only">
              Thông báo
              {unseenCount > 0 ? ` (${unseenCount} mới)` : ""}
            </span>
          </Button>
        }
      />
      <PopoverContent align="end" className="w-96 gap-0 p-0">
        <PopoverHeader className="border-b p-3">
          <div className="flex items-center justify-between">
            <PopoverTitle className="text-sm font-semibold">
              Thông báo
            </PopoverTitle>
            {confirmingClear ? (
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">
                  Ẩn tất cả?
                </span>
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  disabled={isRemovingAll}
                  onClick={handleRemoveAll}
                >
                  {isRemovingAll && (
                    <Loader2 className="size-3.5 animate-spin" />
                  )}
                  Xóa
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  disabled={isRemovingAll}
                  onClick={() => setConfirmingClear(false)}
                >
                  Hủy
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 px-2 text-xs"
                  disabled={unreadCount === 0 || isMarkingAllRead}
                  onClick={() => markAllRead()}
                >
                  <CheckCheck className="size-3.5" />
                  Đánh dấu đã đọc
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-destructive"
                  disabled={
                    !isLoading && notifications.length === 0 && !unreadOnly
                  }
                  onClick={() => setConfirmingClear(true)}
                >
                  <Trash2 className="size-3.5" />
                  Xóa tất cả
                </Button>
              </div>
            )}
          </div>
          <div className="mt-2 flex gap-1">
            {[
              { label: "Tất cả", value: false },
              {
                label: `Chưa đọc${unreadCount ? ` (${unreadCount})` : ""}`,
                value: true,
              },
            ].map((tab) => (
              <Button
                key={tab.label}
                variant={unreadOnly === tab.value ? "secondary" : "ghost"}
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setUnreadOnly(tab.value)}
              >
                {tab.label}
              </Button>
            ))}
          </div>
        </PopoverHeader>

        <div className="max-h-96 overflow-y-auto" onScroll={handleScroll}>
          {isLoading ? (
            <div className="flex justify-center p-6">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              {unreadOnly
                ? "Không có thông báo chưa đọc"
                : "Chưa có thông báo nào"}
            </div>
          ) : (
            <ul className="divide-y">
              {notifications.map((item) => (
                <NotificationRow
                  key={item.id}
                  item={item}
                  onClick={() => handleItemClick(item)}
                  onRemove={() => remove(item.id)}
                />
              ))}
              {isFetchingNextPage && (
                <li className="flex justify-center p-3">
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                </li>
              )}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function NotificationRow({
  item,
  onClick,
  onRemove,
}: {
  item: NotificationItem;
  onClick: () => void;
  onRemove: () => void;
}) {
  const isUnread = !item.readAt;
  const actorName = item.actor?.fullName || item.actor?.username;

  return (
    <li
      className={cn(
        "group relative flex cursor-pointer gap-3 p-3 hover:bg-muted/60",
        isUnread && "bg-primary/5",
      )}
      onClick={onClick}
    >
      <Avatar className="size-8 shrink-0">
        {item.actor?.avatar && <AvatarImage src={item.actor.avatar} />}
        <AvatarFallback className="text-xs">
          {actorName ? (
            actorName.charAt(0).toUpperCase()
          ) : (
            <Bell className="size-3.5" />
          )}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1 pr-5">
        <p className={cn("text-sm leading-snug", isUnread && "font-semibold")}>
          {item.title}
        </p>
        {item.content && (
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
            {item.content}
          </p>
        )}
        <p className="mt-1 text-[11px] text-muted-foreground">
          {formatDistanceToNow(new Date(item.createdAt), {
            addSuffix: true,
            locale: vi,
          })}
        </p>
      </div>

      {isUnread && (
        <span className="absolute top-1/2 right-3 size-2 -translate-y-1/2 rounded-full bg-primary group-hover:hidden" />
      )}
      <button
        type="button"
        title="Ẩn thông báo"
        className="absolute top-2 right-2 hidden rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground group-hover:block"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
      >
        <X className="size-3.5" />
      </button>
    </li>
  );
}
