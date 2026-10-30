import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import type { ChatMessage, Conversation, CursorPage } from "../types";

type MessagePages = InfiniteData<CursorPage<ChatMessage>, number | undefined>;

const _base = ["chats"] as const;
export const CHAT_QUERY_KEYS = {
  all: _base,
  conversations: (workspaceId: number) =>
    [..._base, "conversations", workspaceId] as const,
  conversation: (conversationId: number) =>
    [..._base, "conversation", conversationId] as const,
  members: (conversationId: number) =>
    [..._base, "members", conversationId] as const,
  /** Mọi danh sách tin gốc của conversation (kể cả kết quả tìm kiếm) */
  messagesAll: (conversationId: number) =>
    [..._base, "messages", conversationId] as const,
  messages: (conversationId: number, search?: string) =>
    [..._base, "messages", conversationId, search || null] as const,
  /** Mọi thread của conversation */
  repliesAll: (conversationId: number) =>
    [..._base, "replies", conversationId] as const,
  replies: (conversationId: number, parentId: number) =>
    [..._base, "replies", conversationId, parentId] as const,
  mentions: (workspaceId: number) => [..._base, "mentions", workspaceId] as const,
};

// Reply đã cộng vào replyCount; cần khi thread chưa tải tới cuối (reply không nằm trong cache để so trùng)
const countedReplies = new Set<number>();
const MAX_COUNTED_REPLIES = 2000;

const sameMessage = (a: ChatMessage, b: ChatMessage) =>
  a.id === b.id ||
  (!!a.clientMessageId && a.clientMessageId === b.clientMessageId);

const mapPages = (
  data: MessagePages | undefined,
  fn: (items: ChatMessage[], index: number, pages: CursorPage<ChatMessage>[]) => ChatMessage[],
): MessagePages | undefined =>
  data && {
    ...data,
    pages: data.pages.map((page, index, pages) => ({
      ...page,
      items: fn(page.items, index, pages),
    })),
  };

/** Sửa một tin ở mọi nơi nó xuất hiện (danh sách gốc, kết quả tìm kiếm, thread) */
export function patchMessage(
  queryClient: QueryClient,
  conversationId: number,
  messageId: number,
  patch: (message: ChatMessage) => ChatMessage,
) {
  const update = (data: MessagePages | undefined) =>
    mapPages(data, (items) =>
      items.map((m) => (m.id === messageId ? patch(m) : m)),
    );
  queryClient.setQueriesData<MessagePages>(
    { queryKey: CHAT_QUERY_KEYS.messagesAll(conversationId) },
    update,
  );
  queryClient.setQueriesData<MessagePages>(
    { queryKey: CHAT_QUERY_KEYS.repliesAll(conversationId) },
    update,
  );
}

/**
 * Thêm (hoặc thay tin tạm cùng clientMessageId) vào đúng danh sách:
 * - Tin gốc: đầu trang mới nhất (danh sách mới → cũ), không đụng kết quả tìm kiếm.
 * - Trả lời: cuối thread nếu đã tải tới cuối; tăng replyCount của tin gốc.
 */
export function upsertMessage(queryClient: QueryClient, message: ChatMessage) {
  const { conversationId, parentId } = message;
  let existed = false;
  // Đã có bản thật (id dương) của tin này trong cache, vd event realtime đến sau response
  let existedReal = false;
  const replaceOrInsert = (
    data: MessagePages | undefined,
    insert: (pages: CursorPage<ChatMessage>[]) => CursorPage<ChatMessage>[],
  ) => {
    if (!data) return data;
    const replaced = mapPages(data, (items) =>
      items.map((m) => {
        if (!sameMessage(m, message)) return m;
        existed = true;
        if (m.id > 0) existedReal = true;
        return message;
      }),
    )!;
    return existed ? replaced : { ...replaced, pages: insert(replaced.pages) };
  };

  if (!parentId) {
    queryClient.setQueryData<MessagePages>(
      CHAT_QUERY_KEYS.messages(conversationId),
      (data) =>
        replaceOrInsert(data, (pages) =>
          pages.map((page, i) =>
            i === 0 ? { ...page, items: [message, ...page.items] } : page,
          ),
        ),
    );
    return;
  }

  queryClient.setQueryData<MessagePages>(
    CHAT_QUERY_KEYS.replies(conversationId, parentId),
    (data) =>
      replaceOrInsert(data, (pages) => {
        const last = pages.length - 1;
        // Còn tin mới hơn chưa tải thì để lần tải sau lấy, tránh thủng thứ tự
        if (pages[last].hasMore) return pages;
        return pages.map((page, i) =>
          i === last ? { ...page, items: [...page.items, message] } : page,
        );
      }),
  );
  // Chỉ đếm khi tin thật xuất hiện lần đầu (tin tạm không đếm, kể cả khi thread chưa tải tới cuối)
  if (message.id < 0 || existedReal || countedReplies.has(message.id)) return;
  if (countedReplies.size >= MAX_COUNTED_REPLIES) countedReplies.clear();
  countedReplies.add(message.id);
  patchMessage(queryClient, conversationId, parentId, (parent) => ({
    ...parent,
    replyCount: parent.replyCount + 1,
    lastReplyAt: message.createdAt,
  }));
}

export function removeMessage(
  queryClient: QueryClient,
  conversationId: number,
  messageId: number,
  parentId: number | null,
) {
  let removed = false;
  const drop = (data: MessagePages | undefined) =>
    mapPages(data, (items) =>
      items.filter((m) => {
        if (m.id !== messageId) return true;
        removed = true;
        return false;
      }),
    );
  queryClient.setQueriesData<MessagePages>(
    { queryKey: CHAT_QUERY_KEYS.messagesAll(conversationId) },
    drop,
  );
  queryClient.setQueriesData<MessagePages>(
    { queryKey: CHAT_QUERY_KEYS.repliesAll(conversationId) },
    drop,
  );
  if (parentId && removed)
    patchMessage(queryClient, conversationId, parentId, (parent) => ({
      ...parent,
      replyCount: Math.max(0, parent.replyCount - 1),
    }));
}

/** Sửa một conversation trong sidebar và trong cache chi tiết */
export function patchConversation(
  queryClient: QueryClient,
  conversationId: number,
  patch: (conversation: Conversation) => Conversation,
) {
  queryClient.setQueriesData<Conversation[]>(
    { queryKey: [...CHAT_QUERY_KEYS.all, "conversations"] },
    (list) => list?.map((c) => (c.id === conversationId ? patch(c) : c)),
  );
  queryClient.setQueryData<Conversation>(
    CHAT_QUERY_KEYS.conversation(conversationId),
    (c) => c && patch(c),
  );
}
