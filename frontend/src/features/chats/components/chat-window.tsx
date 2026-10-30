"use client";

import { useCallback, useState } from "react";
import { Archive, ArrowLeft, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  useAutoMarkRead,
  useConversationMembers,
  useConversationRealtime,
  useMessageActions,
  useMessages,
  useSendMessage,
} from "../hooks";
import type { ChatMessage, Conversation } from "../types";
import { ConversationAvatar } from "./chat-avatar";
import { conversationName, typingLabel } from "./chat-utils";
import { MessageComposer } from "./message-composer";
import { MessageList } from "./message-list";
import { ThreadPanel } from "./thread-panel";

type Props = {
  conversation: Conversation;
  myId?: number;
  /** Owner workspace: được xoá tin của người khác */
  canModerate?: boolean;
  /** Mobile: quay lại danh sách */
  onBack?: () => void;
};

function subtitle(conversation: Conversation, memberCount?: number) {
  const count = memberCount ? `${memberCount} thành viên` : "";
  if (conversation.type === "WORKSPACE")
    return ["Kênh chung của workspace", count].filter(Boolean).join(" · ");
  if (conversation.type === "SPACE")
    return ["Kênh dự án", count].filter(Boolean).join(" · ");
  return conversation.participants.length > 2 ? count : "Tin nhắn riêng";
}

export function ChatWindow({ conversation, myId, canModerate = false, onBack }: Props) {
  const conversationId = conversation.id;
  const readOnly = !!conversation.archivedAt;
  const [threadId, setThreadId] = useState<number | null>(null);

  const { messages, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useMessages(conversationId);
  const { data: members = [] } = useConversationMembers(conversationId);
  const { typingUserIds, notifyTyping, stopTyping } =
    useConversationRealtime(conversationId);
  const { update, remove, toggleReaction } = useMessageActions(conversationId);
  const { retry, discard } = useSendMessage(conversationId);

  const latestRealId = messages.findLast((m) => m.id > 0)?.id;
  useAutoMarkRead(conversationId, latestRealId);

  const fetchOlder = useCallback(() => void fetchNextPage(), [fetchNextPage]);
  const threadParent = threadId ? messages.find((m) => m.id === threadId) : undefined;

  const itemProps = {
    myId,
    showAuthorName:
      conversation.type !== "DIRECT" || conversation.participants.length > 2,
    canModerate,
    members,
    readOnly,
    onToggleReaction: toggleReaction,
    onEdit: (message: ChatMessage, content: string) => update(message.id, { content }),
    onDelete: (message: ChatMessage) => {
      if (message.id === threadId) setThreadId(null);
      return remove(message);
    },
    onRetry: (message: ChatMessage) => void retry(message).catch(() => undefined),
    onDiscard: discard,
  };

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1">
      <section
        className={cn(
          "flex min-h-0 min-w-0 flex-1 flex-col",
          threadParent && "hidden lg:flex",
        )}
        aria-label={conversationName(conversation, myId)}
      >
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-3 sm:px-4">
          {onBack && (
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              onClick={onBack}
              aria-label="Quay lại danh sách"
              className="md:hidden"
            >
              <ArrowLeft />
            </Button>
          )}
          <ConversationAvatar conversation={conversation} myId={myId} />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-semibold">
              {conversationName(conversation, myId)}
            </h2>
            <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
              {conversation.type !== "DIRECT" && (
                <Users className="size-3" aria-hidden="true" />
              )}
              {subtitle(conversation, members.length)}
            </p>
          </div>
        </header>

        {readOnly && (
          <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-4 py-2 text-xs text-muted-foreground">
            <Archive className="size-3.5" aria-hidden="true" />
            Space của kênh này đã bị xóa. Kênh chỉ còn để xem lại.
          </div>
        )}

        <MessageList
          conversationId={conversationId}
          messages={messages}
          isLoading={isLoading}
          hasOlder={!!hasNextPage}
          isFetchingOlder={isFetchingNextPage}
          fetchOlder={fetchOlder}
          onReply={(message) => setThreadId(message.id)}
          {...itemProps}
        />

        <div className="h-5 shrink-0 px-4 text-xs italic text-muted-foreground" aria-live="polite">
          {typingLabel(typingUserIds, members)}
        </div>

        <MessageComposer
          key={conversationId}
          conversationId={conversationId}
          members={members}
          myId={myId}
          disabled={readOnly}
          placeholder={`Nhắn tới ${conversationName(conversation, myId)}`}
          onTyping={notifyTyping}
          onStopTyping={stopTyping}
        />
      </section>

      {threadParent && (
        <ThreadPanel
          conversationId={conversationId}
          parent={threadParent}
          onClose={() => setThreadId(null)}
          {...itemProps}
        />
      )}
    </div>
  );
}
