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
import {
  CurrentUser,
  HasPermission,
} from '../../../common/decorators/index.js';
import { UserResponse } from '../../users/dtos/index.js';
import {
  CreatePermissionDto,
  PermissionRequest,
  UpdatePermissionDto,
} from '../dtos/index.js';
import { PermissionService } from '../services/index.js';

@ApiTags('Permissions')
@ApiCookieAuth('access-token-cookie')
@Controller('permissions')
export class PermissionController {
  constructor(private readonly permissionService: PermissionService) {}

  @Get()
  @HasPermission('ROLEGROUP_VIEW')
  @ApiOperation({ summary: 'Lấy danh sách thao tác (Permissions)' })
  async getListPermissions(@Query() query: PermissionRequest) {
    return this.permissionService.getListPermission(query);
  }

  @Get('menu/:menuId')
  @HasPermission('ROLEGROUP_VIEW')
  @ApiOperation({ summary: 'Lấy danh sách thao tác theo Menu ID' })
  @ApiParam({ name: 'menuId', example: 1, type: Number })
  async getPermissionInMenu(@Param('menuId', ParseIntPipe) menuId: number) {
    return this.permissionService.getPermissionInMenu(menuId);
  }

  @Get('matrix')
  @HasPermission('ROLEGROUP_VIEW')
  @ApiOperation({
    summary:
      'Lấy ma trận cây Menu và các Permission tương ứng (dành cho phân quyền)',
  })
  async getMenuPermissionMatrix() {
    return this.permissionService.getMenuPermissionMatrix();
  }

  @Get(':id')
  @HasPermission('ROLEGROUP_VIEW')
  @ApiOperation({ summary: 'Lấy thông tin chi tiết thao tác' })
  @ApiParam({ name: 'id', example: 1, type: Number })
  async getPermissionById(@Param('id', ParseIntPipe) id: number) {
    return this.permissionService.getPermissionById(id);
  }

  @Post()
  @HasPermission('ROLEGROUP_CREATE')
  @ApiOperation({ summary: 'Tạo thao tác (Permission) mới' })
  async createPermission(
    @Body() dto: CreatePermissionDto,
    @CurrentUser('user') user?: UserResponse,
  ) {
    return this.permissionService.savePermission(dto, user);
  }

  @Patch(':id')
  @HasPermission('ROLEGROUP_UPDATE')
  @ApiOperation({ summary: 'Cập nhật thông tin thao tác (Permission)' })
  @ApiParam({ name: 'id', example: 1, type: Number })
  async updatePermission(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePermissionDto,
    @CurrentUser('user') user?: UserResponse,
  ) {
    return this.permissionService.savePermission(dto, user, id);
  }

  @Delete(':id')
  @HasPermission('ROLEGROUP_DELETE')
  @ApiOperation({ summary: 'Xóa thao tác (Permission)' })
  @ApiParam({ name: 'id', example: 1, type: Number })
  async removePermission(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('user') user?: UserResponse,
  ) {
    return this.permissionService.removePermission(id, user);
  }
}
