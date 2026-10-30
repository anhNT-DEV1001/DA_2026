"use client";

import { MessagesSquare, PanelLeftOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppShellStore } from "@/stores/app-shell-store";
import { useAuthStore } from "@/stores/auth-store";
import { useConversation, useConversations } from "../hooks";
import { useActiveConversationId } from "./chat-nav-panel";
import { ChatWindow } from "./chat-window";

type Props = {
  workspaceId: number;
  /** Owner workspace được xoá tin của người khác */
  isOwner?: boolean;
};

/**
 * Khung chat của cuộc trò chuyện đang mở (`?c=<id>`); danh sách nằm ở panel của app sidebar.
 * Dùng useSearchParams → bọc trong <Suspense> ở trang.
 */
export function ChatInbox({ workspaceId, isOwner = false }: Props) {
  const myId = useAuthStore((s) => s.user?.id);
  const setMobileOpen = useAppShellStore((s) => s.setMobileOpen);
  const setPanelOpen = useAppShellStore((s) => s.setPanelOpen);
  const activeId = useActiveConversationId();

  // Cùng query với panel nên không gọi API thêm
  const { conversations } = useConversations(workspaceId);
  const inList = conversations.find((c) => c.id === activeId);
  // Link tới cuộc trò chuyện vừa tạo khi danh sách chưa kịp tải lại
  const { data: detail, isError } = useConversation(inList ? null : activeId);
  const active = inList ?? (detail?.workspaceId === workspaceId ? detail : undefined);
  const unavailable =
    !!activeId && (isError || (!!detail && detail.workspaceId !== workspaceId));

  const showList = () => {
    setPanelOpen(true);
    setMobileOpen(true);
  };

  if (active)
    return (
      <ChatWindow
        key={active.id}
        conversation={active}
        myId={myId}
        canModerate={isOwner}
        onBack={() => setMobileOpen(true)}
      />
    );

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-6 text-center text-muted-foreground">
      <MessagesSquare className="size-12 opacity-40" aria-hidden="true" />
      {unavailable ? (
        <p className="max-w-sm text-sm">
          Không mở được cuộc trò chuyện này. Có thể bạn không còn quyền truy cập hoặc
          nó thuộc workspace khác.
        </p>
      ) : (
        <>
          <p className="text-sm font-medium text-foreground">
            Chọn một cuộc trò chuyện để bắt đầu
          </p>
          <p className="max-w-xs text-sm">
            Trao đổi trong kênh chung, kênh của từng dự án, hoặc nhắn riêng với đồng
            nghiệp.
          </p>
        </>
      )}
      <Button type="button" variant="outline" size="sm" onClick={showList} className="md:hidden">
        <PanelLeftOpen /> Danh sách hội thoại
      </Button>
    </div>
  );
}
