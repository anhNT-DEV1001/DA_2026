"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAppShellStore } from "@/stores/app-shell-store";
import { useAuthStore } from "@/stores/auth-store";
import { useConversations } from "../hooks";
import { ConversationList } from "./conversation-list";
import { NewDirectDialog } from "./new-direct-dialog";

export const CHAT_ROUTE = "/inbox";

/** Cuộc trò chuyện đang mở theo URL (`/inbox?c=<id>`) */
export function useActiveConversationId() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const id = Number(searchParams.get("c"));
  return pathname === CHAT_ROUTE && Number.isSafeInteger(id) && id > 0 ? id : null;
}

/**
 * Danh sách hội thoại hiển thị trong panel menu của app sidebar (menu gốc "Hội thoại").
 * Dùng useSearchParams → bọc trong <Suspense>.
 */
export function ChatNavPanel({ workspaceId }: { workspaceId: number }) {
  const router = useRouter();
  const myId = useAuthStore((s) => s.user?.id);
  const setMobileOpen = useAppShellStore((s) => s.setMobileOpen);
  const activeId = useActiveConversationId();
  const [newDirectOpen, setNewDirectOpen] = useState(false);
  const { conversations, isLoading } = useConversations(workspaceId);

  const open = (id: number) => {
    router.push(`${CHAT_ROUTE}?c=${id}`, { scroll: false });
    // Chỉ đổi query (?c=) nên AppShell không tự đóng overlay mobile
    setMobileOpen(false);
  };

  return (
    <>
      <ConversationList
        conversations={conversations}
        isLoading={isLoading}
        activeId={activeId}
        myId={myId}
        onSelect={open}
        onNewDirect={() => setNewDirectOpen(true)}
      />
      <NewDirectDialog
        workspaceId={workspaceId}
        myId={myId}
        open={newDirectOpen}
        onOpenChange={setNewDirectOpen}
        onOpened={open}
      />
    </>
  );
}
