"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import { chatService } from "../services";
import type {
  ChatMessage,
  ConversationPreferencesInput,
  OpenDirectInput,
  SendMessageInput,
  UpdateMessageInput,
} from "../types";
import {
  CHAT_QUERY_KEYS,
  patchConversation,
  patchMessage,
  removeMessage,
  upsertMessage,
} from "./chat-cache";

const MESSAGE_PAGE_SIZE = 30;
const MENTION_PAGE_SIZE = 20;
// Gom nhiều tin đến liên tiếp thành một lần gọi "đã đọc"
const MARK_READ_DELAY_MS = 800;

const hex = (length: number) =>
  Array.from({ length }, () => Math.floor(Math.random() * 16).toString(16)).join("");

/** UUID v4; crypto.randomUUID chỉ có trong secure context (https / localhost) */
const newClientMessageId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${hex(8)}-${hex(4)}-4${hex(3)}-${(8 + Math.floor(Math.random() * 4)).toString(16)}${hex(3)}-${hex(12)}`;

/* --------------------------------- Queries --------------------------------- */

/** Sidebar chat của workspace (đã sắp: ghim → hoạt động gần nhất) */
export function useConversations(workspaceId: number, enabled = true) {
  const query = useQuery({
    queryKey: CHAT_QUERY_KEYS.conversations(workspaceId),
    queryFn: () => chatService.conversations(workspaceId),
    enabled: enabled && workspaceId > 0,
  });
  const conversations = useMemo(() => query.data ?? [], [query.data]);
  // Không tính các cuộc trò chuyện đã tắt thông báo
  const totalUnread = conversations.reduce(
    (sum, c) => (c.muted ? sum : sum + c.unreadCount),
    0,
  );
  return { ...query, conversations, totalUnread };
}

export function useConversation(conversationId: number | null) {
  return useQuery({
    queryKey: CHAT_QUERY_KEYS.conversation(conversationId ?? 0),
    queryFn: () => chatService.detail(conversationId!),
    enabled: !!conversationId,
  });
}

/** Thành viên có quyền vào cuộc trò chuyện: gợi ý @mention */
export function useConversationMembers(conversationId: number | null) {
  return useQuery({
    queryKey: CHAT_QUERY_KEYS.members(conversationId ?? 0),
    queryFn: () => chatService.members(conversationId!),
    enabled: !!conversationId,
    staleTime: 60_000,
  });
}

/**
 * Tin gốc của cuộc trò chuyện. `fetchNextPage` tải tin CŨ hơn (cuộn lên).
 * `messages` đã sắp cũ → mới để render từ trên xuống.
 */
export function useMessages(
  conversationId: number | null,
  options: { search?: string; enabled?: boolean } = {},
) {
  const { search, enabled = true } = options;
  const query = useInfiniteQuery({
    queryKey: CHAT_QUERY_KEYS.messages(conversationId ?? 0, search),
    queryFn: ({ pageParam }) =>
      chatService.messages(conversationId!, {
        before: pageParam,
        limit: MESSAGE_PAGE_SIZE,
        search: search || undefined,
      }),
    initialPageParam: undefined as number | undefined,
    // Trang mới → cũ: tin cuối của trang là tin cũ nhất
    getNextPageParam: (last) =>
      last.hasMore ? last.items.at(-1)?.id : undefined,
    enabled: enabled && !!conversationId,
  });
  const messages = useMemo(
    () => (query.data?.pages.flatMap((p) => p.items) ?? []).toReversed(),
    [query.data],
  );
  return { ...query, messages };
}

/** Trả lời trong thread, cũ → mới. `fetchNextPage` tải tin MỚI hơn */
export function useMessageReplies(
  conversationId: number | null,
  parentId: number | null,
) {
  const query = useInfiniteQuery({
    queryKey: CHAT_QUERY_KEYS.replies(conversationId ?? 0, parentId ?? 0),
    queryFn: ({ pageParam }) =>
      chatService.replies(conversationId!, parentId!, {
        after: pageParam,
        limit: MESSAGE_PAGE_SIZE,
      }),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (last) =>
      last.hasMore ? last.items.at(-1)?.id : undefined,
    enabled: !!conversationId && !!parentId,
  });
  const replies = useMemo(
    () => query.data?.pages.flatMap((p) => p.items) ?? [],
    [query.data],
  );
  return { ...query, replies };
}

/** Tin nhắc đến tôi trong workspace, mới nhất trước */
export function useChatMentions(workspaceId: number, enabled = true) {
  const query = useInfiniteQuery({
    queryKey: CHAT_QUERY_KEYS.mentions(workspaceId),
    queryFn: ({ pageParam }) =>
      chatService.mentions(workspaceId, {
        page: pageParam,
        limit: MENTION_PAGE_SIZE,
      }),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.meta.hasNextPage ? last.meta.page + 1 : undefined,
    enabled: enabled && workspaceId > 0,
  });
  const mentions = useMemo(
    () => query.data?.pages.flatMap((p) => p.items) ?? [],
    [query.data],
  );
  return { ...query, mentions };
}

/* ------------------------------ Conversation ------------------------------ */

/** Mở chat riêng (đã có thì trả về cái cũ) rồi đưa vào sidebar */
export function useOpenDirect(workspaceId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: OpenDirectInput) =>
      chatService.openDirect(workspaceId, dto),
    onSuccess: (conversation) => {
      queryClient.setQueryData(
        CHAT_QUERY_KEYS.conversation(conversation.id),
        conversation,
      );
      void queryClient.invalidateQueries({
        queryKey: CHAT_QUERY_KEYS.conversations(workspaceId),
      });
    },
  });
}

export function useConversationActions(conversationId: number) {
  const queryClient = useQueryClient();

  const preferencesMutation = useMutation({
    mutationFn: (dto: ConversationPreferencesInput) =>
      chatService.updatePreferences(conversationId, dto),
    onMutate: (dto) =>
      patchConversation(queryClient, conversationId, (c) => ({ ...c, ...dto })),
    onSettled: (conversation) => {
      // Ghim thay đổi thứ tự sidebar → tải lại theo thứ tự của server
      void queryClient.invalidateQueries({
        queryKey: conversation
          ? CHAT_QUERY_KEYS.conversations(conversation.workspaceId)
          : [...CHAT_QUERY_KEYS.all, "conversations"],
      });
    },
  });

  return {
    updatePreferences: preferencesMutation.mutate,
    toggleMute: (muted: boolean) => preferencesMutation.mutate({ muted }),
    togglePin: (pinned: boolean) => preferencesMutation.mutate({ pinned }),
    isUpdatingPreferences: preferencesMutation.isPending,
  };
}

/**
 * Đánh dấu đã đọc khi đang xem cuộc trò chuyện và có tin mới hơn mốc đã đọc.
 * Chỉ gọi khi tab đang hiển thị; gom các tin đến liên tiếp thành một request.
 */
export function useAutoMarkRead(
  conversationId: number | null,
  latestMessageId: number | undefined,
  enabled = true,
) {
  const queryClient = useQueryClient();
  const { mutate } = useMutation({
    mutationFn: (args: { conversationId: number; messageId: number }) =>
      chatService.markRead(args.conversationId, args.messageId),
    onSuccess: ({ conversationId: id, lastReadMessageId }) =>
      patchConversation(queryClient, id, (c) => ({
        ...c,
        unreadCount: 0,
        lastReadMessageId,
      })),
  });
  const lastSent = useRef(new Map<number, number>());

  useEffect(() => {
    // Bỏ qua tin tạm (id âm) đang gửi
    if (!enabled || !conversationId || !latestMessageId || latestMessageId < 0)
      return;
    if ((lastSent.current.get(conversationId) ?? 0) >= latestMessageId) return;

    const send = () => {
      if (document.visibilityState !== "visible") return;
      lastSent.current.set(conversationId, latestMessageId);
      mutate({ conversationId, messageId: latestMessageId });
    };
    const timer = setTimeout(send, MARK_READ_DELAY_MS);
    // Tab đang ẩn: đánh dấu khi người dùng quay lại
    document.addEventListener("visibilitychange", send);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", send);
    };
  }, [conversationId, latestMessageId, enabled, mutate]);
}

/* --------------------------------- Messages -------------------------------- */

/**
 * Gửi tin lạc quan: hiện ngay với `localStatus: 'sending'`, thay bằng tin thật khi xong,
 * lỗi thì chuyển `'failed'` để `retry`. Gửi lại dùng cùng clientMessageId nên không bị trùng.
 */
export function useSendMessage(conversationId: number) {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const mutation = useMutation({
    mutationFn: (dto: SendMessageInput & { clientMessageId: string }) =>
      chatService.send(conversationId, dto),
    onMutate: (dto) => {
      const temp: ChatMessage = {
        id: -Date.now(),
        conversationId,
        parentId: dto.parentId ?? null,
        type: "TEXT",
        contentType: dto.contentType ?? "markdown",
        content: dto.content ?? "",
        data: null,
        clientMessageId: dto.clientMessageId,
        authorId: user?.id ?? null,
        author: user
          ? {
              id: user.id,
              fullName: user.fullName,
              username: user.username,
              avatar: user.avatar ?? null,
            }
          : null,
        editedAt: null,
        createdAt: new Date().toISOString(),
        // Tên file chỉ có sau khi tin thật trả về
        attachments: [],
        mentionUserIds: dto.mentionUserIds ?? [],
        reactions: [],
        replyCount: 0,
        lastReplyAt: null,
        localStatus: "sending",
      };
      upsertMessage(queryClient, temp);
      return { temp };
    },
    onSuccess: (message) => {
      upsertMessage(queryClient, message);
      // Tin cuối + thứ tự sidebar lấy theo server (preview đã bỏ định dạng)
      void queryClient.invalidateQueries({
        queryKey: [...CHAT_QUERY_KEYS.all, "conversations"],
      });
    },
    onError: (_error, _dto, context) => {
      if (context)
        upsertMessage(queryClient, { ...context.temp, localStatus: "failed" });
    },
  });

  const send = (dto: SendMessageInput) =>
    mutation.mutateAsync({
      ...dto,
      clientMessageId: dto.clientMessageId ?? newClientMessageId(),
    });

  /** Gửi lại tin lỗi, giữ nguyên clientMessageId */
  const retry = (failed: ChatMessage) =>
    mutation.mutateAsync({
      content: failed.content,
      contentType: failed.contentType,
      parentId: failed.parentId,
      mentionUserIds: failed.mentionUserIds,
      clientMessageId: failed.clientMessageId ?? newClientMessageId(),
    });

  /** Bỏ tin lỗi khỏi danh sách */
  const discard = (failed: ChatMessage) =>
    removeMessage(queryClient, conversationId, failed.id, null);

  return { send, retry, discard, isSending: mutation.isPending, error: mutation.error };
}

export function useMessageActions(conversationId: number) {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);

  const updateMutation = useMutation({
    mutationFn: ({ messageId, dto }: { messageId: number; dto: UpdateMessageInput }) =>
      chatService.update(conversationId, messageId, dto),
    onSuccess: (message) =>
      patchMessage(queryClient, conversationId, message.id, () => message),
  });

  const removeMutation = useMutation({
    mutationFn: (message: Pick<ChatMessage, "id" | "parentId">) =>
      chatService.remove(conversationId, message.id),
    onSuccess: (_result, message) => {
      removeMessage(queryClient, conversationId, message.id, message.parentId);
      // Có thể vừa xoá tin cuối → preview sidebar đổi
      void queryClient.invalidateQueries({
        queryKey: [...CHAT_QUERY_KEYS.all, "conversations"],
      });
    },
  });

  /** Thả hoặc bỏ emoji tuỳ theo mình đã thả chưa */
  const reactionMutation = useMutation({
    mutationFn: ({ message, emoji }: { message: ChatMessage; emoji: string }) => {
      const reacted = message.reactions.some(
        (r) => r.emoji === emoji && userId !== undefined && r.userIds.includes(userId),
      );
      return reacted
        ? chatService.removeReaction(conversationId, message.id, emoji)
        : chatService.addReaction(conversationId, message.id, emoji);
    },
    onSuccess: ({ messageId, reactions }) =>
      patchMessage(queryClient, conversationId, messageId, (m) => ({
        ...m,
        reactions,
      })),
  });

  return {
    update: (messageId: number, dto: UpdateMessageInput) =>
      updateMutation.mutateAsync({ messageId, dto }),
    isUpdating: updateMutation.isPending,
    remove: removeMutation.mutateAsync,
    isRemoving: removeMutation.isPending,
    toggleReaction: (message: ChatMessage, emoji: string) =>
      reactionMutation.mutate({ message, emoji }),
  };
}

/** Upload file trước khi gửi; dùng `id` trả về cho `attachmentIds` */
export function useUploadAttachment(conversationId: number) {
  return useMutation({
    mutationFn: (file: File) => chatService.uploadAttachment(conversationId, file),
  });
}
