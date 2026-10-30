import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Conversation,
  ConversationParticipant,
  Message,
  MessageAttachment,
  MessageMention,
  MessageReaction,
} from './entities/index.js';
import { WorkspaceAccessModule } from '../workspaces/workspace-access.module.js';
import { NotificationModule } from '../notifications/notification.module.js';
import {
  AttachmentService,
  ChatAccessService,
  ChatRealtimeService,
  ConversationService,
  MessageReactionService,
  MessageService,
} from './services/index.js';
import { ChatGateway } from './gateways/chat.gateway.js';
import { ChatsController } from './chats.controller.js';

@Module({
  imports: [
    WorkspaceAccessModule,
    NotificationModule,
    TypeOrmModule.forFeature([
      Conversation,
      ConversationParticipant,
      Message,
      MessageAttachment,
      MessageMention,
      MessageReaction,
    ]),
  ],
  controllers: [ChatsController],
  providers: [
    ChatAccessService,
    ChatRealtimeService,
    ConversationService,
    MessageService,
    MessageReactionService,
    AttachmentService,
    ChatGateway,
  ],
  // Cho WorkspacesModule: tạo kênh khi tạo workspace/space, thu hồi realtime khi đổi thành viên
  exports: [ConversationService, ChatRealtimeService],
})
export class ChatsModule {}
