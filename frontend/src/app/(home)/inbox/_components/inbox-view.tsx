"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { ChatInbox } from "@/features/chats";
import { useAppNavigation } from "@/features/menus/hooks/useAppNavigation";
import { useAuthStore } from "@/stores/auth-store";

/** Chat của workspace đang chọn (switcher ở panel "Hội thoại" của app sidebar) */
export function InboxView() {
  const { currentWorkspace, isLoading } = useAppNavigation();
  const myId = useAuthStore((s) => s.user?.id);

  if (isLoading)
    return (
      <div className="space-y-4 p-6">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="size-8 rounded-full" />
            <Skeleton className="h-10 flex-1" />
          </div>
        ))}
      </div>
    );

  if (!currentWorkspace)
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
        Bạn chưa tham gia workspace nào. Hãy tạo hoặc tham gia một workspace để bắt đầu
        trò chuyện.
      </div>
    );

  return (
    <ChatInbox
      key={currentWorkspace.id}
      workspaceId={currentWorkspace.id}
      isOwner={currentWorkspace.ownerId === myId}
    />
  );
}
