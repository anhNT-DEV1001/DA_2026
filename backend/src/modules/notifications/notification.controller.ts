import {
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/index.js';
import { UserResponse } from '../users/dtos/index.js';
import { NotificationRequest } from './dtos/index.js';
import { NotificationService } from './notification.service.js';

@ApiTags('Notifications')
@ApiCookieAuth('access-token-cookie')
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách thông báo của người dùng hiện tại' })
  async findAll(
    @Query() query: NotificationRequest,
    @CurrentUser('user') user: UserResponse,
  ) {
    return this.notificationService.findForUser(user.id!, query);
  }

  @Get('count')
  @ApiOperation({ summary: 'Đếm số thông báo chưa đọc / chưa xem' })
  async count(@CurrentUser('user') user: UserResponse) {
    return this.notificationService.countForUser(user.id!);
  }

  @Patch('seen')
  @ApiOperation({ summary: 'Đánh dấu đã xem tất cả (reset badge)' })
  async markAllSeen(@CurrentUser('user') user: UserResponse) {
    return this.notificationService.markAllSeen(user.id!);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Đánh dấu đã đọc tất cả thông báo' })
  async markAllRead(@CurrentUser('user') user: UserResponse) {
    return this.notificationService.markAllRead(user.id!);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Đánh dấu đã đọc một thông báo' })
  @ApiParam({ name: 'id', example: 1, type: Number })
  async markRead(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('user') user: UserResponse,
  ) {
    return this.notificationService.markRead(user.id!, id);
  }

  @Delete()
  @ApiOperation({ summary: 'Ẩn tất cả thông báo' })
  async removeAll(@CurrentUser('user') user: UserResponse) {
    return this.notificationService.removeAll(user.id!);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Ẩn một thông báo' })
  @ApiParam({ name: 'id', example: 1, type: Number })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('user') user: UserResponse,
  ) {
    return this.notificationService.remove(user.id!, id);
  }
}
