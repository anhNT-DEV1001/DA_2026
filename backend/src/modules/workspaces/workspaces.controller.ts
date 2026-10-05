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
import { CurrentUser } from '../../common/decorators/index.js';
import { UserResponse } from '../users/dtos/index.js';
import {
  CreateWorkspaceDto,
  UpdateWorkspaceDto,
  WorkspaceRequest,
} from './dtos/index.js';
import { WorkspacesService } from './services/workspaces.service.js';

@ApiTags('Workspaces')
@ApiCookieAuth('access-token-cookie')
@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Get('my')
  @ApiOperation({ summary: 'Lấy danh sách workspace của người dùng hiện tại' })
  async getCurrentUserWorkspaces(@CurrentUser('user') user: UserResponse) {
    return this.workspacesService.getCurrentUserWorkspaces(user);
  }

  @Get()
  @ApiOperation({
    summary: 'Lấy danh sách workspace (có tìm kiếm & phân trang)',
  })
  async findAll(
    @Query() query: WorkspaceRequest,
    @CurrentUser('user') user?: UserResponse,
  ) {
    return this.workspacesService.findAll(query, user);
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Lấy chi tiết workspace theo slug' })
  @ApiParam({ name: 'slug', example: 'workspace-da-2026', type: String })
  async getBySlug(
    @Param('slug') slug: string,
    @CurrentUser('user') user?: UserResponse,
  ) {
    return this.workspacesService.getWorkspaceBySlug(slug, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết workspace theo ID' })
  @ApiParam({ name: 'id', example: 1, type: Number })
  async getById(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('user') user?: UserResponse,
  ) {
    return this.workspacesService.getWorkspaceById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Tạo mới một workspace' })
  async create(
    @Body() dto: CreateWorkspaceDto,
    @CurrentUser('user') user?: UserResponse,
  ) {
    return this.workspacesService.createWorkspace(dto, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật workspace' })
  @ApiParam({ name: 'id', example: 1, type: Number })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateWorkspaceDto,
    @CurrentUser('user') user?: UserResponse,
  ) {
    return this.workspacesService.updateWorkspace(id, dto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa mềm workspace' })
  @ApiParam({ name: 'id', example: 1, type: Number })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('user') user?: UserResponse,
  ) {
    return this.workspacesService.removeWorkspace(id, user);
  }
}
