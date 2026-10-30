import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Message, MessageReaction } from '../entities/index.js';
import { ChatAccessService } from './chat-access.service.js';
import { ChatRealtimeService } from './chat-realtime.service.js';
import { MessageService } from './message.service.js';

@Injectable()
export class MessageReactionService {
  constructor(
    private readonly source: DataSource,
    private readonly chatAccess: ChatAccessService,
    private readonly messages: MessageService,
    private readonly realtime: ChatRealtimeService,
  ) {}

  private async target(conversationId: number, messageId: number, userId: number) {
    const { conversation } = await this.chatAccess.conversation(userId, conversationId);
    this.chatAccess.assertWritable(conversation);
    const message = await this.source.getRepository(Message).findOne({
      select: { id: true, parentId: true },
      where: { id: messageId, conversationId },
    });
    if (!message)
      throw new NotFoundException('Không tìm thấy tin nhắn trong cuộc trò chuyện');
    return message;
  }

  private async changed(
    conversationId: number,
    message: Pick<Message, 'id' | 'parentId'>,
    userId: number,
    origin?: string,
  ) {
    const reactions = (await this.messages.reactionSummary([message.id])).get(message.id) ?? [];
    this.realtime.emit(
      conversationId,
      'reaction.changed',
      { conversationId, messageId: message.id, parentId: message.parentId, actorId: userId, reactions },
      origin,
    );
    return { messageId: message.id, reactions };
  }

  /** Thả lại cùng emoji không lỗi (UQ message_id + user_id + emoji) */
  async add(
    conversationId: number,
    messageId: number,
    userId: number,
    emoji: string,
    origin?: string,
  ) {
    const message = await this.target(conversationId, messageId, userId);
    await this.source
      .createQueryBuilder()
      .insert()
      .into(MessageReaction)
      .values({ messageId, userId, emoji, createdBy: userId, updatedBy: userId })
      .orIgnore()
      .execute();
    return this.changed(conversationId, message, userId, origin);
  }

  async remove(
    conversationId: number,
    messageId: number,
    userId: number,
    emoji: string,
    origin?: string,
  ) {
    const message = await this.target(conversationId, messageId, userId);
    await this.source
      .getRepository(MessageReaction)
      .delete({ messageId, userId, emoji });
    return this.changed(conversationId, message, userId, origin);
  }
}
