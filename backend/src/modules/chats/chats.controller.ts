import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import {
  CurrentUser,
  HasPermission,
  SocketId,
} from '../../common/decorators/index.js';
import { createMulterOptions } from '../../common/utils/multer.util.js';
import { UserResponse } from '../users/dtos/index.js';
import {
  ChatPageQuery,
  MarkConversationReadDto,
  MessageCursorQuery,
  OpenDirectConversationDto,
  ReactionDto,
  SendMessageDto,
  UpdateConversationPreferencesDto,
  UpdateMessageDto,
} from './dtos/index.js';
import {
  AttachmentService,
  CHAT_FILE_FOLDER,
  CHAT_STORAGE_ROOT,
  ConversationService,
  MessageReactionService,
  MessageService,
} from './services/index.js';

const chatFileUploadOptions = createMulterOptions({
  folder: CHAT_FILE_FOLDER,
  root: CHAT_STORAGE_ROOT,
  allowedTypes: ['image', 'pdf', 'excel', 'doc', 'video'],
});

/** Quyền thực sự do membership workspace/space/DM quyết định (xem ChatAccessService) */
@ApiTags('Chats')
@ApiCookieAuth('access-token-cookie')
@HasPermission('WORKSPACE_VIEW')
@Controller('chats')
export class ChatsController {
  constructor(
    private readonly conversations: ConversationService,
    private readonly messages: MessageService,
    private readonly reactions: MessageReactionService,
    private readonly attachments: AttachmentService,
  ) {}

  /* -------------------------------- Workspace -------------------------------- */

  @Get('workspaces/:workspaceId/conversations')
  @ApiOperation({ summary: 'Sidebar chat: kênh chung, kênh các space mình tham gia, chat riêng' })
  listConversations(
    @Param('workspaceId', ParseIntPipe) workspaceId: number,
    @CurrentUser('user') user: UserResponse,
  ) {
    return this.conversations.list(workspaceId, user.id!);
  }

  @Post('workspaces/:workspaceId/direct')
  @ApiOperation({ summary: 'Mở chat riêng 1-1 hoặc nhóm nhỏ (đã có thì trả về cuộc trò chuyện cũ)' })
  openDirect(
    @Param('workspaceId', ParseIntPipe) workspaceId: number,
    @CurrentUser('user') user: UserResponse,
    @Body() dto: OpenDirectConversationDto,
  ) {
    return this.conversations.openDirect(workspaceId, user.id!, dto);
  }

  @Get('workspaces/:workspaceId/mentions')
  @ApiOperation({ summary: 'Tin nhắn nhắc đến tôi trong workspace' })
  mentions(
    @Param('workspaceId', ParseIntPipe) workspaceId: number,
    @CurrentUser('user') user: UserResponse,
    @Query() query: ChatPageQuery,
  ) {
    return this.messages.mentions(workspaceId, user.id!, query);
  }

  /* ------------------------------ Conversation ------------------------------ */

  @Get('conversations/:conversationId')
  detail(
    @Param('conversationId', ParseIntPipe) conversationId: number,
    @CurrentUser('user') user: UserResponse,
  ) {
    return this.conversations.detail(conversationId, user.id!);
  }

  @Get('conversations/:conversationId/members')
  @ApiOperation({ summary: 'Thành viên có quyền vào cuộc trò chuyện (gợi ý @mention)' })
  members(
    @Param('conversationId', ParseIntPipe) conversationId: number,
    @CurrentUser('user') user: UserResponse,
  ) {
    return this.conversations.members(conversationId, user.id!);
  }

  @Patch('conversations/:conversationId/preferences')
  @ApiOperation({ summary: 'Tắt thông báo / ghim cuộc trò chuyện' })
  updatePreferences(
    @Param('conversationId', ParseIntPipe) conversationId: number,
    @CurrentUser('user') user: UserResponse,
    @Body() dto: UpdateConversationPreferencesDto,
  ) {
    return this.conversations.updatePreferences(conversationId, user.id!, dto);
  }

  @Post('conversations/:conversationId/read')
  @HttpCode(200)
  @ApiOperation({ summary: 'Đánh dấu đã đọc tới một tin (mặc định tin mới nhất)' })
  markRead(
    @Param('conversationId', ParseIntPipe) conversationId: number,
    @CurrentUser('user') user: UserResponse,
    @Body() dto: MarkConversationReadDto,
  ) {
    return this.conversations.markRead(conversationId, user.id!, dto.messageId);
  }

  /* --------------------------------- Messages -------------------------------- */

  @Get('conversations/:conversationId/messages')
  @ApiOperation({ summary: 'Tin gốc, mới nhất trước; phân trang bằng before/after' })
  listMessages(
    @Param('conversationId', ParseIntPipe) conversationId: number,
    @CurrentUser('user') user: UserResponse,
    @Query() query: MessageCursorQuery,
  ) {
    return this.messages.list(conversationId, user.id!, query);
  }

  @Get('conversations/:conversationId/messages/:messageId/replies')
  @ApiOperation({ summary: 'Trả lời trong thread, cũ nhất trước' })
  replies(
    @Param('conversationId', ParseIntPipe) conversationId: number,
    @Param('messageId', ParseIntPipe) messageId: number,
    @CurrentUser('user') user: UserResponse,
    @Query() query: MessageCursorQuery,
  ) {
    return this.messages.replies(conversationId, messageId, user.id!, query);
  }

  @Post('conversations/:conversationId/messages')
  sendMessage(
    @Param('conversationId', ParseIntPipe) conversationId: number,
    @CurrentUser('user') user: UserResponse,
    @Body() dto: SendMessageDto,
    @SocketId() origin?: string,
  ) {
    return this.messages.send(conversationId, user.id!, dto, origin);
  }

  @Patch('conversations/:conversationId/messages/:messageId')
  updateMessage(
    @Param('conversationId', ParseIntPipe) conversationId: number,
    @Param('messageId', ParseIntPipe) messageId: number,
    @CurrentUser('user') user: UserResponse,
    @Body() dto: UpdateMessageDto,
    @SocketId() origin?: string,
  ) {
    return this.messages.update(conversationId, messageId, user.id!, dto, origin);
  }

  @Delete('conversations/:conversationId/messages/:messageId')
  @HttpCode(200)
  removeMessage(
    @Param('conversationId', ParseIntPipe) conversationId: number,
    @Param('messageId', ParseIntPipe) messageId: number,
    @CurrentUser('user') user: UserResponse,
    @SocketId() origin?: string,
  ) {
    return this.messages.remove(conversationId, messageId, user.id!, origin);
  }

  @Post('conversations/:conversationId/messages/:messageId/reactions')
  @HttpCode(200)
  addReaction(
    @Param('conversationId', ParseIntPipe) conversationId: number,
    @Param('messageId', ParseIntPipe) messageId: number,
    @CurrentUser('user') user: UserResponse,
    @Body() dto: ReactionDto,
    @SocketId() origin?: string,
  ) {
    return this.reactions.add(conversationId, messageId, user.id!, dto.emoji, origin);
  }

  @Delete('conversations/:conversationId/messages/:messageId/reactions/:emoji')
  @HttpCode(200)
  removeReaction(
    @Param('conversationId', ParseIntPipe) conversationId: number,
    @Param('messageId', ParseIntPipe) messageId: number,
    @Param('emoji') emoji: string,
    @CurrentUser('user') user: UserResponse,
    @SocketId() origin?: string,
  ) {
    return this.reactions.remove(conversationId, messageId, user.id!, emoji, origin);
  }

  /* ------------------------------- Attachments ------------------------------- */

  @Post('conversations/:conversationId/attachments')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload file trước, rồi gửi kèm qua attachmentIds' })
  @UseInterceptors(FileInterceptor('file', chatFileUploadOptions))
  uploadAttachment(
    @Param('conversationId', ParseIntPipe) conversationId: number,
    @CurrentUser('user') user: UserResponse,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.attachments.upload(conversationId, user.id!, file);
  }

  /** Tự gửi file nên không đi qua TransformInterceptor; `?download=1` để tải về thay vì xem trực tiếp */
  @Get('conversations/:conversationId/attachments/:attachmentId')
  async downloadAttachment(
    @Param('conversationId', ParseIntPipe) conversationId: number,
    @Param('attachmentId', ParseIntPipe) attachmentId: number,
    @Query('download') download: string | undefined,
    @CurrentUser('user') user: UserResponse,
    @Res() res: Response,
  ) {
    const file = await this.attachments.resolveDownload(
      conversationId,
      attachmentId,
      user.id!,
    );
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (download) return res.download(file.path, file.originalName);
    res.setHeader(
      'Content-Disposition',
      `inline; filename*=UTF-8''${encodeURIComponent(file.originalName)}`,
    );
    res.type(file.mimeType);
    return res.sendFile(file.path);
  }
}
