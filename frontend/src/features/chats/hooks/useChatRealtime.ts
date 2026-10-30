"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useRealtime,
  useRealtimeChannel,
} from "@/providers/websocket-provider";
import { useAuthStore } from "@/stores/auth-store";
import {
  CHAT_CHANNEL,
  chatTopic,
  type ChatMessage,
  type ChatTopicEvent,
  type ChatUserEvent,
  type ConversationActivityPayload,
  type MarkReadResult,
  type MessageDeletedPayload,
  type ReactionChangedPayload,
  type TypingPayload,
} from "../types";
import {
  CHAT_QUERY_KEYS,
  patchConversation,
  patchMessage,
  removeMessage,
  upsertMessage,
} from "./chat-cache";

// Không nhận tín hiệu mới trong khoảng này thì coi như đã ngừng gõ (phòng khi mất event "ngừng")
const TYPING_EXPIRE_MS = 6000;
// Gửi "đang gõ" tối đa một lần mỗi khoảng này
const TYPING_THROTTLE_MS = 3000;

/** Sau khi kết nối lại có thể đã lỡ event → làm mới các query theo `keys` */
function useRefetchOnReconnect(keys: readonly (readonly unknown[])[], enabled = true) {
  const queryClient = useQueryClient();
  const { status } = useRealtime();
  const wasDisconnected = useRef(false);
  const keysRef = useRef(keys);
  useEffect(() => {
    keysRef.current = keys;
  });
  useEffect(() => {
    if (!enabled) return;
    if (status === "disconnected") wasDisconnected.current = true;
    if (status === "connected" && wasDisconnected.current) {
      wasDisconnected.current = false;
      for (const queryKey of keysRef.current)
        void queryClient.invalidateQueries({ queryKey });
    }
  }, [status, enabled, queryClient]);
}

/**
 * Event gửi theo user trên channel 'chat' (không cần subscribe): giữ sidebar và badge chưa đọc
 * đúng kể cả khi không mở cuộc trò chuyện nào. Chỉ gọi một lần (vd: trong layout của workspace).
 */
export function useChatRealtime() {
  const queryClient = useQueryClient();

  useRealtimeChannel<unknown>(CHAT_CHANNEL, (env) => {
    const event = env.event as ChatUserEvent;
    if (event === "conversation.read") {
      // Đã đọc trên tab/thiết bị khác
      const { conversationId, lastReadMessageId } = env.data as MarkReadResult;
      patchConversation(queryClient, conversationId, (c) => ({
        ...c,
        unreadCount: 0,
        lastReadMessageId,
      }));
      return;
    }
    // conversation.activity | conversation.created: tin cuối, số chưa đọc, thứ tự do server tính
    const { workspaceId } = env.data as Pick<ConversationActivityPayload, "workspaceId">;
    void queryClient.invalidateQueries({
      queryKey: CHAT_QUERY_KEYS.conversations(workspaceId),
    });
    if (event === "conversation.activity")
      void queryClient.invalidateQueries({
        queryKey: CHAT_QUERY_KEYS.mentions(workspaceId),
      });
  });

  useRefetchOnReconnect([CHAT_QUERY_KEYS.all]);
}

/**
 * Subscribe topic 'chat:{conversationId}' khi đang mở cuộc trò chuyện:
 * cập nhật cache tin nhắn / thread / reaction và trạng thái "đang gõ".
 */
export function useConversationRealtime(conversationId: number | null) {
  const queryClient = useQueryClient();
  const { emit } = useRealtime();
  const myId = useAuthStore((s) => s.user?.id);
  const [typingUserIds, setTypingUserIds] = useState<number[]>([]);
  const typingTimers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const clearTyping = useCallback((userId: number) => {
    clearTimeout(typingTimers.current.get(userId));
    typingTimers.current.delete(userId);
    setTypingUserIds((ids) =>
      ids.includes(userId) ? ids.filter((id) => id !== userId) : ids,
    );
  }, []);

  const setTyping = useCallback(
    (userId: number, isTyping: boolean) => {
      if (!isTyping) return clearTyping(userId);
      const timers = typingTimers.current;
      clearTimeout(timers.get(userId));
      timers.set(userId, setTimeout(() => clearTyping(userId), TYPING_EXPIRE_MS));
      setTypingUserIds((ids) => (ids.includes(userId) ? ids : [...ids, userId]));
    },
    [clearTyping],
  );

  // Đổi cuộc trò chuyện: xoá trạng thái gõ của cuộc cũ
  useEffect(() => {
    const timers = typingTimers.current;
    return () => {
      timers.forEach(clearTimeout);
      timers.clear();
      setTypingUserIds([]);
    };
  }, [conversationId]);

  useRealtimeChannel<unknown>(
    conversationId ? chatTopic(conversationId) : null,
    (env) => {
      if (!conversationId) return;
      const event = env.event as ChatTopicEvent;
      switch (event) {
        case "message.created": {
          const message = env.data as ChatMessage;
          upsertMessage(queryClient, message);
          // Người vừa gửi chắc chắn đã ngừng gõ
          if (message.authorId) setTyping(message.authorId, false);
          return;
        }
        case "message.updated": {
          const message = env.data as ChatMessage;
          patchMessage(queryClient, conversationId, message.id, () => message);
          return;
        }
        case "message.deleted": {
          const { messageId, parentId } = env.data as MessageDeletedPayload;
          removeMessage(queryClient, conversationId, messageId, parentId);
          return;
        }
        case "reaction.changed": {
          const { messageId, reactions } = env.data as ReactionChangedPayload;
          patchMessage(queryClient, conversationId, messageId, (m) => ({
            ...m,
            reactions,
          }));
          return;
        }
        case "typing": {
          const { userId, isTyping } = env.data as TypingPayload;
          // Tab khác của chính mình
          if (userId !== myId) setTyping(userId, isTyping);
          return;
        }
      }
    },
    { subscribe: true },
  );

  useRefetchOnReconnect(
    conversationId
      ? [
          CHAT_QUERY_KEYS.messagesAll(conversationId),
          CHAT_QUERY_KEYS.repliesAll(conversationId),
        ]
      : [],
    !!conversationId,
  );

  const lastTypingSent = useRef(0);
  /** Gọi mỗi khi ô nhập thay đổi; tự giới hạn tần suất gửi */
  const notifyTyping = useCallback(() => {
    if (!conversationId) return;
    const now = Date.now();
    if (now - lastTypingSent.current < TYPING_THROTTLE_MS) return;
    lastTypingSent.current = now;
    void emit("chat.typing", { conversationId, isTyping: true });
  }, [conversationId, emit]);

  /** Gọi khi gửi tin, xoá hết nội dung hoặc rời ô nhập */
  const stopTyping = useCallback(() => {
    if (!conversationId || !lastTypingSent.current) return;
    lastTypingSent.current = 0;
    void emit("chat.typing", { conversationId, isTyping: false });
  }, [conversationId, emit]);

  return { typingUserIds, notifyTyping, stopTyping };
}
