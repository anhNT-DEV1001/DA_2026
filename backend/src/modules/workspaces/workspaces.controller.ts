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
  UseGuards,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser, HasPermission } from '../../common/decorators/index.js';
import { UserResponse } from '../users/dtos/index.js';
import {
  AddWorkspaceMemberDto,
  CreateWorkspaceDto,
  CreateSpaceDto,
  UpdateSpaceDto,
  SpaceRequest,
  UpdateWorkspaceDto,
  UpdateWorkspaceMemberDto,
  WorkspaceMemberRequest,
  WorkspaceRequest,
  AddSpaceMemberDto,
  SpaceMemberRequest,
} from './dtos/index.js';
import WorkspaceSearch from './dtos/workspace.dto.js';
import { SpaceGuard, WorkspaceGuard } from './guards/index.js';
import {
  WorkspaceMemberService,
  WorkspacesService,
  SpaceService,
  SpaceMemberService,
} from './services/index.js';

@ApiTags('Workspaces')
@ApiCookieAuth('access-token-cookie')
@Controller('workspaces')
export class WorkspacesController {
  constructor(
    private readonly workspacesService: WorkspacesService,
    private readonly workspaceMemberService: WorkspaceMemberService,
    private readonly spaceService: SpaceService,
    private readonly spaceMemberService: SpaceMemberService,
  ) {}

  /* ========================================================================= */
  /*                             WORKSPACE APIs                                */
  /* ========================================================================= */

  @Get('my')
  @ApiOperation({ summary: 'Lấy danh sách workspace của người dùng hiện tại' })
  async getCurrentUserWorkspaces(@CurrentUser('user') user: UserResponse) {
    return this.workspacesService.getCurrentUserWorkspaces(user);
  }

  @Get()
  @HasPermission('WORKSPACE_VIEW')
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
  @UseGuards(WorkspaceGuard)
  @HasPermission('WORKSPACE_VIEW')
  @ApiOperation({ summary: 'Lấy chi tiết workspace theo slug' })
  @ApiParam({ name: 'slug', example: 'workspace-da-2026', type: String })
  async getBySlug(
    @Param('slug') slug: string,
    @CurrentUser('user') user?: UserResponse,
  ) {
    return this.workspacesService.getWorkspaceBySlug(slug, user);
  }

  @Get('search')
  @ApiOperation({ summary: 'Tìm kiếm workspace để đăng ký tham gia' })
  async searchWorkspaces(
    @Query() query: WorkspaceSearch,
    @CurrentUser('user') user?: UserResponse,
  ) {
    return this.workspacesService.searchWorkspaces(query, user);
  }

  @Get(':id')
  @HasPermission('WORKSPACE_VIEW')
  @ApiOperation({ summary: 'Lấy chi tiết workspace theo ID' })
  @ApiParam({ name: 'id', example: 1, type: Number })
  async getById(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('user') user?: UserResponse,
  ) {
    return this.workspacesService.getWorkspaceById(id);
  }

  @Post()
  @HasPermission('WORKSPACE_CREATE')
  @ApiOperation({ summary: 'Tạo mới một workspace' })
  async create(
    @Body() dto: CreateWorkspaceDto,
    @CurrentUser('user') user?: UserResponse,
  ) {
    return this.workspacesService.createWorkspace(dto, user);
  }

  @Patch(':id')
  @HasPermission('WORKSPACE_UPDATE')
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
  @HasPermission('WORKSPACE_DELETE')
  @ApiOperation({ summary: 'Xóa mềm workspace' })
  @ApiParam({ name: 'id', example: 1, type: Number })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('user') user?: UserResponse,
  ) {
    return this.workspacesService.removeWorkspace(id, user);
  }

  /* ========================================================================= */
  /*                          WORKSPACE MEMBERS APIs                           */
  /* ========================================================================= */

  @Get(':id/members')
  @HasPermission('WORKSPACE_VIEW')
  @ApiOperation({
    summary:
      'Lấy danh sách thành viên trong workspace (phân trang, lọc theo vai trò/trạng thái, join role & user)',
  })
  @ApiParam({
    name: 'id',
    example: 1,
    type: Number,
    description: 'ID workspace',
  })
  async getMembers(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: WorkspaceMemberRequest,
  ) {
    return this.workspaceMemberService.findAll(id, query);
  }

  @Get(':id/members/:userId')
  @HasPermission('WORKSPACE_VIEW')
  @ApiOperation({
    summary: 'Lấy thông tin chi tiết một thành viên trong workspace',
  })
  @ApiParam({
    name: 'id',
    example: 1,
    type: Number,
    description: 'ID workspace',
  })
  @ApiParam({
    name: 'userId',
    example: 1,
    type: Number,
    description: 'ID người dùng (thành viên)',
  })
  async getMemberDetail(
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.workspaceMemberService.findOne(id, userId);
  }

  @Post(':id/members')
  @HasPermission('WORKSPACE_CREATE')
  @ApiOperation({ summary: 'Thêm thành viên mới vào workspace' })
  @ApiParam({
    name: 'id',
    example: 1,
    type: Number,
    description: 'ID workspace',
  })
  async addMember(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddWorkspaceMemberDto,
    @CurrentUser('user') user?: UserResponse,
  ) {
    return this.workspaceMemberService.addMember(id, dto, user?.id);
  }

  @Patch(':id/members/:userId')
  @HasPermission('WORKSPACE_UPDATE')
  @ApiOperation({
    summary:
      'Cập nhật vai trò (role) hoặc trạng thái của thành viên trong workspace',
  })
  @ApiParam({
    name: 'id',
    example: 1,
    type: Number,
    description: 'ID workspace',
  })
  @ApiParam({
    name: 'userId',
    example: 1,
    type: Number,
    description: 'ID người dùng (thành viên)',
  })
  async updateMember(
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: UpdateWorkspaceMemberDto,
    @CurrentUser('user') user?: UserResponse,
  ) {
    return this.workspaceMemberService.updateMember(id, userId, dto, user?.id);
  }

  @Patch(':id/members/:userId/approve')
  @HasPermission('WORKSPACE_APPROVE')
  @ApiOperation({ summary: 'Chủ sở hữu duyệt thành viên vào workspace' })
  @ApiParam({
    name: 'id',
    example: 1,
    type: Number,
    description: 'ID workspace',
  })
  @ApiParam({
    name: 'userId',
    example: 1,
    type: Number,
    description: 'ID người dùng cần duyệt',
  })
  async approveMember(
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) userId: number,
    @CurrentUser('user') user?: UserResponse,
  ) {
    return this.workspaceMemberService.approveMember(id, userId, user?.id);
  }

  @Patch(':id/members/:userId/reject')
  @HasPermission('WORKSPACE_APPROVE')
  @ApiOperation({ summary: 'Chủ sở hữu từ chối yêu cầu tham gia workspace' })
  @ApiParam({
    name: 'id',
    example: 1,
    type: Number,
    description: 'ID workspace',
  })
  @ApiParam({
    name: 'userId',
    example: 1,
    type: Number,
    description: 'ID người dùng bị từ chối',
  })
  async rejectMember(
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) userId: number,
    @CurrentUser('user') user?: UserResponse,
  ) {
    return this.workspaceMemberService.rejectMember(id, userId, user?.id);
  }

  @Delete(':id/members/:userId')
  @HasPermission('WORKSPACE_DELETE')
  @ApiOperation({ summary: 'Xóa thành viên khỏi workspace' })
  @ApiParam({
    name: 'id',
    example: 1,
    type: Number,
    description: 'ID workspace',
  })
  @ApiParam({
    name: 'userId',
    example: 1,
    type: Number,
    description: 'ID người dùng (thành viên)',
  })
  async removeMember(
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.workspaceMemberService.removeMember(id, userId);
  }

  /* ========================================================================= */
  /*                                Space APIs                                 */
  /* ========================================================================= */

  @Get(':id/spaces/my')
  @HasPermission('WORKSPACE_VIEW')
  @ApiOperation({
    summary:
      'Lấy danh sách space mà người dùng hiện tại đang tham gia trong workspace',
  })
  @ApiParam({
    name: 'id',
    example: 1,
    type: Number,
    description: 'ID workspace',
  })
  async getMySpacesInWorkspace(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('user') user: UserResponse,
  ) {
    return this.spaceMemberService.findMySpacesInWorkspace(id, user.id!);
  }

  @Get(':id/spaces')
  @HasPermission('WORKSPACE_VIEW')
  @ApiOperation({ summary: 'Lấy danh sách space trong workspace' })
  @ApiParam({
    name: 'id',
    example: 1,
    type: Number,
    description: 'ID workspace',
  })
  async getSpaces(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: SpaceRequest,
  ) {
    return this.spaceService.findAll(id, query);
  }

  @Get(':id/spaces/:spaceId')
  @UseGuards(SpaceGuard)
  @HasPermission('WORKSPACE_VIEW')
  @ApiOperation({ summary: 'Lấy chi tiết một space' })
  @ApiParam({
    name: 'id',
    example: 1,
    type: Number,
    description: 'ID workspace',
  })
  @ApiParam({
    name: 'spaceId',
    example: 1,
    type: Number,
    description: 'ID space',
  })
  async getSpace(
    @Param('id', ParseIntPipe) id: number,
    @Param('spaceId', ParseIntPipe) spaceId: number,
  ) {
    return this.spaceService.findOne(id, spaceId);
  }

  @Post(':id/spaces')
  @HasPermission('WORKSPACE_CREATE')
  @ApiOperation({ summary: 'Tạo mới space trong workspace' })
  @ApiParam({
    name: 'id',
    example: 1,
    type: Number,
    description: 'ID workspace',
  })
  async createSpace(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateSpaceDto,
    @CurrentUser('user') user?: UserResponse,
  ) {
    return this.spaceService.create(id, dto, user);
  }

  @Patch(':id/spaces/:spaceId')
  @HasPermission('WORKSPACE_UPDATE')
  @ApiOperation({ summary: 'Cập nhật thông tin space' })
  @ApiParam({
    name: 'id',
    example: 1,
    type: Number,
    description: 'ID workspace',
  })
  @ApiParam({
    name: 'spaceId',
    example: 1,
    type: Number,
    description: 'ID space',
  })
  async updateSpace(
    @Param('id', ParseIntPipe) id: number,
    @Param('spaceId', ParseIntPipe) spaceId: number,
    @Body() dto: UpdateSpaceDto,
    @CurrentUser('user') user?: UserResponse,
  ) {
    return this.spaceService.update(id, spaceId, dto, user);
  }

  @Delete(':id/spaces/:spaceId')
  @HasPermission('WORKSPACE_DELETE')
  @ApiOperation({ summary: 'Xóa mềm space' })
  @ApiParam({
    name: 'id',
    example: 1,
    type: Number,
    description: 'ID workspace',
  })
  @ApiParam({
    name: 'spaceId',
    example: 1,
    type: Number,
    description: 'ID space',
  })
  async removeSpace(
    @Param('id', ParseIntPipe) id: number,
    @Param('spaceId', ParseIntPipe) spaceId: number,
    @CurrentUser('user') user?: UserResponse,
  ) {
    return this.spaceService.remove(id, spaceId, user);
  }

  /* ========================================================================= */
  /*                            Space Members APIs                              */
  /* ========================================================================= */

  @Get(':id/spaces/:spaceId/members')
  @HasPermission('WORKSPACE_VIEW')
  @ApiOperation({ summary: 'Lấy danh sách thành viên trong space' })
  @ApiParam({
    name: 'id',
    example: 1,
    type: Number,
    description: 'ID workspace',
  })
  @ApiParam({
    name: 'spaceId',
    example: 1,
    type: Number,
    description: 'ID space',
  })
  async getSpaceMembers(
    @Param('id', ParseIntPipe) id: number,
    @Param('spaceId', ParseIntPipe) spaceId: number,
    @Query() query: SpaceMemberRequest,
  ) {
    return this.spaceMemberService.findAll(id, spaceId, query);
  }

  @Get(':id/spaces/:spaceId/members/:memberId')
  @HasPermission('WORKSPACE_VIEW')
  @ApiOperation({ summary: 'Lấy chi tiết một thành viên trong space' })
  @ApiParam({
    name: 'id',
    example: 1,
    type: Number,
    description: 'ID workspace',
  })
  @ApiParam({
    name: 'spaceId',
    example: 1,
    type: Number,
    description: 'ID space',
  })
  @ApiParam({
    name: 'memberId',
    example: 1,
    type: Number,
    description: 'ID workspace_member',
  })
  async getSpaceMemberDetail(
    @Param('id', ParseIntPipe) id: number,
    @Param('spaceId', ParseIntPipe) spaceId: number,
    @Param('memberId', ParseIntPipe) memberId: number,
  ) {
    return this.spaceMemberService.findOne(id, spaceId, memberId);
  }

  @Post(':id/spaces/:spaceId/members')
  @HasPermission('WORKSPACE_CREATE')
  @ApiOperation({ summary: 'Thêm thành viên workspace vào space' })
  @ApiParam({
    name: 'id',
    example: 1,
    type: Number,
    description: 'ID workspace',
  })
  @ApiParam({
    name: 'spaceId',
    example: 1,
    type: Number,
    description: 'ID space',
  })
  async addSpaceMember(
    @Param('id', ParseIntPipe) id: number,
    @Param('spaceId', ParseIntPipe) spaceId: number,
    @Body() dto: AddSpaceMemberDto,
    @CurrentUser('user') user?: UserResponse,
  ) {
    return this.spaceMemberService.addMember(id, spaceId, dto, user?.id);
  }

  @Delete(':id/spaces/:spaceId/members/:memberId')
  @HasPermission('WORKSPACE_DELETE')
  @ApiOperation({ summary: 'Xóa thành viên khỏi space' })
  @ApiParam({
    name: 'id',
    example: 1,
    type: Number,
    description: 'ID workspace',
  })
  @ApiParam({
    name: 'spaceId',
    example: 1,
    type: Number,
    description: 'ID space',
  })
  @ApiParam({
    name: 'memberId',
    example: 1,
    type: Number,
    description: 'ID workspace_member',
  })
  async removeSpaceMember(
    @Param('id', ParseIntPipe) id: number,
    @Param('spaceId', ParseIntPipe) spaceId: number,
    @Param('memberId', ParseIntPipe) memberId: number,
  ) {
    return this.spaceMemberService.removeMember(id, spaceId, memberId);
  }
}
