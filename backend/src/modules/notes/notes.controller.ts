import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser, HasPermission } from '../../common/decorators/index.js';
import { UserResponse } from '../users/dtos/index.js';
import { CreateNoteDto, NoteRequest, UpdateNoteDto } from './dtos/index.js';
import { NotesService } from './notes.service.js';

@ApiTags('Notes')
@ApiCookieAuth('access-token-cookie')
@Controller('notes')
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Get()
  @HasPermission('NOTE_VIEW')
  @ApiOperation({ summary: 'Lấy danh sách ghi chú của người dùng hiện tại' })
  async findAll(
    @Query() query: NoteRequest,
    @CurrentUser('user') user: UserResponse,
  ) {
    return this.notesService.findAll(user.id!, query);
  }

  @Get(':id')
  @HasPermission('NOTE_VIEW')
  @ApiOperation({ summary: 'Lấy chi tiết một ghi chú' })
  @ApiParam({ name: 'id', example: 1, type: Number })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('user') user: UserResponse,
  ) {
    return this.notesService.findOne(user.id!, id);
  }

  @Post()
  @HasPermission('NOTE_CREATE')
  @ApiOperation({ summary: 'Tạo ghi chú mới' })
  async create(
    @Body() dto: CreateNoteDto,
    @CurrentUser('user') user: UserResponse,
  ) {
    return this.notesService.create(user.id!, dto);
  }

  @Patch(':id')
  @HasPermission('NOTE_UPDATE')
  @ApiOperation({ summary: 'Cập nhật nội dung / màu ghi chú' })
  @ApiParam({ name: 'id', example: 1, type: Number })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateNoteDto,
    @CurrentUser('user') user: UserResponse,
  ) {
    return this.notesService.update(user.id!, id, dto);
  }

  @Patch(':id/restore')
  @HasPermission('NOTE_DELETE')
  @ApiOperation({ summary: 'Khôi phục ghi chú đã xóa (hoàn tác)' })
  @ApiParam({ name: 'id', example: 1, type: Number })
  async restore(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('user') user: UserResponse,
  ) {
    return this.notesService.restore(user.id!, id);
  }

  @Delete(':id')
  @HasPermission('NOTE_DELETE')
  @ApiOperation({ summary: 'Xóa ghi chú' })
  @ApiParam({ name: 'id', example: 1, type: Number })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('user') user: UserResponse,
  ) {
    return this.notesService.remove(user.id!, id);
  }
}
