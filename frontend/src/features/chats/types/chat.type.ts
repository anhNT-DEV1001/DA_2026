/** Khớp với backend modules/chats (entities, dtos, services) */

export type ConversationType = "WORKSPACE" | "SPACE" | "DIRECT";
export type MessageType = "TEXT" | "SYSTEM";
export type MessageContentType = "markdown" | "html" | "text";

/** Tối đa số người trong chat riêng, tính cả bản thân */
export const MAX_DIRECT_MEMBERS = 10;
export const MAX_MESSAGE_LENGTH = 20000;

export interface ChatUser {
  id: number;
  fullName: string;
  username: string;
  avatar: string | null;
}

/* -------------------------------- Conversation -------------------------------- */

export interface ConversationLastMessage {
  id: number;
  type: MessageType;
  /** Chữ thuần, đã cắt ngắn */
  preview: string;
  authorId: number | null;
  author: ChatUser | null;
  createdAt: string;
}

export interface Conversation {
  id: number;
  workspaceId: number;
  type: ConversationType;
  /** WORKSPACE: tên kênh; SPACE: tên space; DIRECT: tên nhóm (null với 1-1 → hiển thị theo người kia) */
  name: string | null;
  spaceId: number | null;
  space: { id: number; name: string | null; icon: string | null } | null;
  /** Khác null: kênh chỉ đọc (vd space đã bị xoá) */
  archivedAt: string | null;
  lastMessageAt: string | null;
  muted: boolean;
  pinned: boolean;
  lastReadMessageId: number | null;
  unreadCount: number;
  lastMessage: ConversationLastMessage | null;
  /** Chỉ có với DIRECT */
  participants: ChatUser[];
}

export interface OpenDirectInput {
  /** Không cần gồm bản thân */
  userIds: number[];
  /** Chỉ dùng cho nhóm từ 3 người */
  name?: string;
}

export interface ConversationPreferencesInput {
  muted?: boolean;
  pinned?: boolean;
}

export interface MarkReadResult {
  conversationId: number;
  lastReadMessageId: number | null;
}

/* ---------------------------------- Message ---------------------------------- */

export interface MessageAttachment {
  id: number;
  originalName: string;
  mimeType: string;
  size: number;
}

/** Kết quả upload: dùng `id` cho `attachmentIds` khi gửi tin */
export interface UploadedAttachment extends MessageAttachment {
  conversationId: number;
  createdAt: string;
}

export interface ReactionSummary {
  emoji: string;
  count: number;
  userIds: number[];
}

/** Trạng thái chỉ có ở client cho tin gửi lạc quan (optimistic) */
export type MessageLocalStatus = "sending" | "failed";

export interface ChatMessage {
  /** Âm với tin đang gửi (chưa có id thật) */
  id: number;
  conversationId: number;
  parentId: number | null;
  type: MessageType;
  contentType: MessageContentType;
  content: string;
  /** Dữ liệu của tin SYSTEM */
  data: Record<string, unknown> | null;
  clientMessageId: string | null;
  authorId: number | null;
  author: ChatUser | null;
  editedAt: string | null;
  createdAt: string;
  attachments: MessageAttachment[];
  mentionUserIds: number[];
  reactions: ReactionSummary[];
  replyCount: number;
  lastReplyAt: string | null;
  localStatus?: MessageLocalStatus;
}

export interface SendMessageInput {
  /** Có thể bỏ trống nếu có attachmentIds */
  content?: string;
  contentType?: MessageContentType;
  parentId?: number | null;
  /** UUID client sinh; gửi lại cùng giá trị không tạo tin trùng */
  clientMessageId?: string;
  mentionUserIds?: number[];
  attachmentIds?: number[];
}

export interface UpdateMessageInput {
  content: string;
  /** Thay toàn bộ danh sách người được nhắc */
  mentionUserIds?: number[];
}

/** `before`: tin cũ hơn mốc; `after`: tin mới hơn mốc */
export interface MessageCursorParams {
  before?: number;
  after?: number;
  limit?: number;
  search?: string;
}

/**
 * Trang theo cursor.
 * - Danh sách tin gốc: mới → cũ.
 * - Trả lời trong thread: cũ → mới.
 */
export interface CursorPage<T> {
  items: T[];
  hasMore: boolean;
}

export interface ChatPage<T> {
  items: T[];
  meta: {
    page: number;
    limit: number;
    itemCount: number;
    pageCount: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
  };
}

export interface ChatPageParams {
  page?: number;
  limit?: number;
}

export interface ReactionResult {
  messageId: number;
  reactions: ReactionSummary[];
}

export interface DeletedMessageResult {
  id: number;
  deletedAt: string;
}

/* ---------------------------------- Realtime ---------------------------------- */

/** Channel theo user (không cần subscribe): sidebar, badge */
export const CHAT_CHANNEL = "chat";
/** Topic theo conversation (cần subscribe) */
export const chatTopic = (conversationId: number) =>
  `${CHAT_CHANNEL}:${conversationId}`;

export type ChatTopicEvent =
  | "message.created" // data: ChatMessage
  | "message.updated" // data: ChatMessage
  | "message.deleted" // data: MessageDeletedPayload
  | "reaction.changed" // data: ReactionChangedPayload
  | "typing"; // data: TypingPayload

export type ChatUserEvent =
  | "conversation.activity" // data: ConversationActivityPayload
  | "conversation.created" // data: ConversationCreatedPayload
  | "conversation.read"; // data: MarkReadResult

export interface MessageDeletedPayload {
  conversationId: number;
  messageId: number;
  parentId: number | null;
  actorId: number;
}

export interface ReactionChangedPayload {
  conversationId: number;
  messageId: number;
  parentId: number | null;
  actorId: number;
  reactions: ReactionSummary[];
}

export interface TypingPayload {
  conversationId: number;
  userId: number;
  isTyping: boolean;
}

export interface ConversationActivityPayload {
  conversationId: number;
  workspaceId: number;
  messageId: number;
  parentId: number | null;
  authorId: number;
  author: ChatUser | null;
  preview: string;
  createdAt: string;
}

export interface ConversationCreatedPayload {
  conversationId: number;
  workspaceId: number;
}
