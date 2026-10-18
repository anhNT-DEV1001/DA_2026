import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { RolePermissionService, RoleService } from '../services/index.js';
import {
  AssignRolePermissionDto,
  RoleDto,
  RoleRequest,
  UpdateRolePermissionsDto,
} from '../dtos/index.js';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { HasPermission } from '../../../common/decorators/index.js';

@ApiTags('Roles')
@ApiCookieAuth('access-token-cookie')
@Controller('roles')
export class RoleController {
  constructor(
    private readonly roleService: RoleService,
    private readonly rolePermissionService: RolePermissionService,
  ) {}

  @Get()
  @HasPermission('ROLEGROUP_VIEW')
  @ApiOperation({ summary: 'Lấy danh sách vai trò' })
  async getListController(@Query() query: RoleRequest) {
    const data = await this.roleService.getListRole(query);
    return data;
  }

  @Get(':id/permissions')
  @HasPermission('ROLEGROUP_VIEW')
  @ApiOperation({ summary: 'Lấy danh sách ID các quyền của vai trò' })
  @ApiParam({ name: 'id', example: 1, type: Number })
  async getRolePermissions(@Param('id', ParseIntPipe) id: number) {
    return this.rolePermissionService.getPermissionsByRoleId(id);
  }

  @Post(':id/permissions/assign')
  @HasPermission('ROLEGROUP_ACCESS_CONTROL')
  @ApiOperation({ summary: 'Gán 1 quyền cho vai trò' })
  @ApiParam({ name: 'id', example: 1, type: Number })
  async assignPermissionToRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignRolePermissionDto,
  ) {
    return this.rolePermissionService.addPermissionToRole(id, dto.permissionId);
  }

  @Post(':id/permissions/revoke')
  @HasPermission('ROLEGROUP_ACCESS_CONTROL')
  @ApiOperation({ summary: 'Thu hồi 1 quyền khỏi vai trò' })
  @ApiParam({ name: 'id', example: 1, type: Number })
  async revokePermissionFromRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignRolePermissionDto,
  ) {
    return this.rolePermissionService.removePermissionFromRole(
      id,
      dto.permissionId,
    );
  }

  @Post(':id/permissions/toggle')
  @HasPermission('ROLEGROUP_ACCESS_CONTROL')
  @ApiOperation({ summary: 'Chuyển đổi (Toggle) 1 quyền cho vai trò' })
  @ApiParam({ name: 'id', example: 1, type: Number })
  async togglePermissionForRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignRolePermissionDto,
  ) {
    return this.rolePermissionService.togglePermissionForRole(
      id,
      dto.permissionId,
    );
  }

  @Put(':id/permissions')
  @HasPermission('ROLEGROUP_ACCESS_CONTROL')
  @ApiOperation({
    summary: 'Cập nhật đồng bộ toàn bộ danh sách quyền cho vai trò',
  })
  @ApiParam({ name: 'id', example: 1, type: Number })
  async updateRolePermissions(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRolePermissionsDto,
  ) {
    return this.rolePermissionService.updateRolePermissions(
      id,
      dto.permissionIds,
    );
  }

  @Get(':id')
  @HasPermission('ROLEGROUP_VIEW')
  @ApiOperation({ summary: 'Lấy thông tin vai trò' })
  @ApiParam({ name: 'id', example: 1, type: Number })
  async getByIdController(@Param('id', ParseIntPipe) id: number) {
    const response = await this.roleService.getById(id);
    return response;
  }

  @Post()
  @HasPermission('ROLEGROUP_CREATE')
  @ApiOperation({ summary: 'Tạo vai trò' })
  async createRole(@Body() dto: RoleDto) {
    const response = await this.roleService.saveRole(dto);
    return response;
  }

  @Patch(':id')
  @HasPermission('ROLEGROUP_UPDATE')
  @ApiOperation({ summary: 'Cập nhật vai trò' })
  @ApiParam({ name: 'id', example: 1, type: Number })
  async updateRoleController(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RoleDto,
  ) {
    const response = await this.roleService.saveRole(dto, id);
    return response;
  }

  @Delete(':id')
  @HasPermission('ROLEGROUP_DELETE')
  @ApiOperation({ summary: 'Xóa vai trò' })
  @ApiParam({ name: 'id', example: 1, type: Number })
  async removeRoleController(@Param('id', ParseIntPipe) id: number) {
    const response = await this.roleService.removeRole(id);
    return response;
  }
}
