import { format, isSameDay, isToday, isYesterday } from "date-fns";
import { vi } from "date-fns/locale";
import type { ChatMessage, ChatUser, Conversation } from "../types";

/** Hai tin liên tiếp của cùng người trong khoảng này thì gộp (ẩn avatar/tên) */
const GROUP_WINDOW_MS = 5 * 60 * 1000;

export const QUICK_REACTIONS = ["👍", "❤️", "😂", "🎉", "😮", "😢"];

/** Avatar lưu dạng đường dẫn tương đối (/uploads/...) hoặc URL đầy đủ */
export function avatarUrl(path?: string | null) {
  if (!path) return undefined;
  if (/^(https?:|blob:)/.test(path)) return path;
  return path.startsWith("/") ? path : `/${path}`;
}

export function initials(name?: string | null) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  const letters =
    parts.length === 1 ? parts[0].slice(0, 2) : parts[0][0] + parts.at(-1)![0];
  return letters.toUpperCase();
}

/** Người kia trong DM 1-1 (null nếu là nhóm hoặc kênh) */
export function directPartner(conversation: Conversation, myId?: number) {
  if (conversation.type !== "DIRECT") return null;
  const others = conversation.participants.filter((p) => p.id !== myId);
  return others.length === 1 ? others[0] : null;
}

export function conversationName(conversation: Conversation, myId?: number) {
  if (conversation.name) return conversation.name;
  if (conversation.type === "DIRECT") {
    const others = conversation.participants.filter((p) => p.id !== myId);
    if (!others.length) return "Chỉ mình bạn";
    return others.map((p) => p.fullName).join(", ");
  }
  return conversation.type === "SPACE" ? "Space" : "Kênh chung";
}

/** Giờ ngắn cho sidebar: hôm nay → giờ, hôm qua → "Hôm qua", còn lại → ngày */
export function formatShortTime(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (isToday(date)) return format(date, "HH:mm");
  if (isYesterday(date)) return "Hôm qua";
  return format(date, "dd/MM");
}

export function formatMessageTime(value: string) {
  return format(new Date(value), "HH:mm");
}

export function formatFullTime(value: string) {
  return format(new Date(value), "HH:mm, EEEE dd/MM/yyyy", { locale: vi });
}

export function formatDayLabel(value: string) {
  const date = new Date(value);
  if (isToday(date)) return "Hôm nay";
  if (isYesterday(date)) return "Hôm qua";
  return format(date, "EEEE, dd/MM/yyyy", { locale: vi });
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export const isImage = (mimeType: string) => mimeType.startsWith("image/");

/** Tin bắt đầu một ngày mới so với tin trước */
export function startsNewDay(message: ChatMessage, previous?: ChatMessage) {
  return (
    !previous ||
    !isSameDay(new Date(previous.createdAt), new Date(message.createdAt))
  );
}

/** Gộp với tin trước: cùng tác giả, cùng ngày, cách nhau ít phút, không phải tin hệ thống */
export function isGroupedWith(message: ChatMessage | undefined, previous?: ChatMessage) {
  return (
    !!message &&
    !!previous &&
    message.type === "TEXT" &&
    previous.type === "TEXT" &&
    previous.authorId === message.authorId &&
    !startsNewDay(message, previous) &&
    new Date(message.createdAt).getTime() -
      new Date(previous.createdAt).getTime() <
      GROUP_WINDOW_MS
  );
}

export function typingLabel(userIds: number[], members: ChatUser[] = []) {
  const names = userIds.map(
    (id) => members.find((m) => m.id === id)?.fullName ?? "Ai đó",
  );
  if (!names.length) return "";
  if (names.length === 1) return `${names[0]} đang nhập...`;
  if (names.length === 2) return `${names[0]} và ${names[1]} đang nhập...`;
  return `${names[0]} và ${names.length - 1} người khác đang nhập...`;
}
