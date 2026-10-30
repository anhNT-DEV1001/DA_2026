import { apiClient } from "@/lib/axios";
import type {
  ChatMessage,
  ChatPage,
  ChatPageParams,
  ChatUser,
  Conversation,
  ConversationPreferencesInput,
  CursorPage,
  DeletedMessageResult,
  MarkReadResult,
  MessageCursorParams,
  OpenDirectInput,
  ReactionResult,
  SendMessageInput,
  UpdateMessageInput,
  UploadedAttachment,
} from "../types";

const workspacePath = (workspaceId: number) => `/chats/workspaces/${workspaceId}`;
const conversationPath = (conversationId: number) =>
  `/chats/conversations/${conversationId}`;
const messagePath = (conversationId: number, messageId?: number) =>
  messageId
    ? `${conversationPath(conversationId)}/messages/${messageId}`
    : `${conversationPath(conversationId)}/messages`;

export const chatService = {
  /* -------------------------------- Workspace -------------------------------- */

  /**
   * Sidebar: kênh chung, kênh các space mình tham gia, chat riêng
   * GET /chats/workspaces/:workspaceId/conversations
   */
  conversations: (workspaceId: number) =>
    apiClient.get<unknown, Conversation[]>(
      `${workspacePath(workspaceId)}/conversations`,
    ),

  /**
   * Mở chat riêng 1-1 hoặc nhóm nhỏ; đã có thì trả về cuộc trò chuyện cũ
   * POST /chats/workspaces/:workspaceId/direct
   */
  openDirect: (workspaceId: number, dto: OpenDirectInput) =>
    apiClient.post<unknown, Conversation>(
      `${workspacePath(workspaceId)}/direct`,
      dto,
    ),

  /**
   * Tin nhắn nhắc đến tôi
   * GET /chats/workspaces/:workspaceId/mentions
   */
  mentions: (workspaceId: number, params?: ChatPageParams) =>
    apiClient.get<unknown, ChatPage<ChatMessage>>(
      `${workspacePath(workspaceId)}/mentions`,
      { params },
    ),

  /* ------------------------------ Conversation ------------------------------ */

  detail: (conversationId: number) =>
    apiClient.get<unknown, Conversation>(conversationPath(conversationId)),

  /** Thành viên có quyền vào cuộc trò chuyện (gợi ý @mention) */
  members: (conversationId: number) =>
    apiClient.get<unknown, ChatUser[]>(
      `${conversationPath(conversationId)}/members`,
    ),

  updatePreferences: (
    conversationId: number,
    dto: ConversationPreferencesInput,
  ) =>
    apiClient.patch<unknown, Conversation>(
      `${conversationPath(conversationId)}/preferences`,
      dto,
    ),

  /** Không truyền messageId = đọc tới tin mới nhất */
  markRead: (conversationId: number, messageId?: number) =>
    apiClient.post<unknown, MarkReadResult>(
      `${conversationPath(conversationId)}/read`,
      messageId ? { messageId } : {},
    ),

  /* --------------------------------- Messages -------------------------------- */

  /** Tin gốc, mới → cũ */
  messages: (conversationId: number, params?: MessageCursorParams) =>
    apiClient.get<unknown, CursorPage<ChatMessage>>(messagePath(conversationId), {
      params,
    }),

  /** Trả lời trong thread, cũ → mới */
  replies: (
    conversationId: number,
    messageId: number,
    params?: MessageCursorParams,
  ) =>
    apiClient.get<unknown, CursorPage<ChatMessage>>(
      `${messagePath(conversationId, messageId)}/replies`,
      { params },
    ),

  send: (conversationId: number, dto: SendMessageInput) =>
    apiClient.post<unknown, ChatMessage>(messagePath(conversationId), dto),

  update: (conversationId: number, messageId: number, dto: UpdateMessageInput) =>
    apiClient.patch<unknown, ChatMessage>(
      messagePath(conversationId, messageId),
      dto,
    ),

  remove: (conversationId: number, messageId: number) =>
    apiClient.delete<unknown, DeletedMessageResult>(
      messagePath(conversationId, messageId),
    ),

  addReaction: (conversationId: number, messageId: number, emoji: string) =>
    apiClient.post<unknown, ReactionResult>(
      `${messagePath(conversationId, messageId)}/reactions`,
      { emoji },
    ),

  removeReaction: (conversationId: number, messageId: number, emoji: string) =>
    apiClient.delete<unknown, ReactionResult>(
      `${messagePath(conversationId, messageId)}/reactions/${encodeURIComponent(emoji)}`,
    ),

  /* ------------------------------- Attachments ------------------------------- */

  /** Upload trước, rồi gửi kèm `id` qua `attachmentIds` */
  uploadAttachment: (conversationId: number, file: File) => {
    const data = new FormData();
    data.append("file", file);
    return apiClient.post<unknown, UploadedAttachment>(
      `${conversationPath(conversationId)}/attachments`,
      data,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
  },

  /**
   * URL để hiển thị (<img src>, <a href>) hoặc tải file; đi qua proxy nên cookie đăng nhập được gửi kèm
   * GET /chats/conversations/:conversationId/attachments/:attachmentId
   */
  attachmentUrl: (
    conversationId: number,
    attachmentId: number,
    download = false,
  ) =>
    `${apiClient.defaults.baseURL}${conversationPath(conversationId)}/attachments/${attachmentId}${download ? "?download=1" : ""}`,
};
