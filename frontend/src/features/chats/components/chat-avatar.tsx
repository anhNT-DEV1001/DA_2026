"use client";

import { Hash, LayoutList, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { ChatUser, Conversation } from "../types";
import { avatarUrl, directPartner, initials } from "./chat-utils";

export function ChatUserAvatar({
  user,
  size = "default",
  className,
}: {
  user: Pick<ChatUser, "fullName" | "avatar"> | null;
  size?: "default" | "sm" | "lg";
  className?: string;
}) {
  const src = avatarUrl(user?.avatar);
  return (
    <Avatar size={size} className={className}>
      {src && <AvatarImage src={src} alt={user?.fullName ?? ""} />}
      <AvatarFallback className="bg-primary/10 text-[11px] font-semibold text-primary">
        {initials(user?.fullName)}
      </AvatarFallback>
    </Avatar>
  );
}

/** Kênh chung: #, kênh space: icon space, DM 1-1: avatar người kia, nhóm: icon nhóm */
export function ConversationAvatar({
  conversation,
  myId,
  size = "default",
  className,
}: {
  conversation: Conversation;
  myId?: number;
  size?: "default" | "sm" | "lg";
  className?: string;
}) {
  const partner = directPartner(conversation, myId);
  if (partner)
    return <ChatUserAvatar user={partner} size={size} className={className} />;

  const Icon =
    conversation.type === "WORKSPACE"
      ? Hash
      : conversation.type === "SPACE"
        ? LayoutList
        : Users;
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary",
        size === "sm" ? "size-6" : size === "lg" ? "size-10" : "size-8",
        className,
      )}
      aria-hidden="true"
    >
      <Icon className={size === "lg" ? "size-5" : "size-4"} />
    </span>
  );
}
