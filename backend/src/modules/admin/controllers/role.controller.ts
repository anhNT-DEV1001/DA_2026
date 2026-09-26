import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { RoleService } from '../services/index.js';
import { RoleDto, RoleRequest } from '../dtos/index.js';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Roles')
@ApiCookieAuth('access-token-cookie')
@Controller('roles')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách vai trò' })
  async getListController(@Query() query: RoleRequest) {
    const data = await this.roleService.getListRole(query);
    return data;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin vai trò' })
  @ApiParam({ name: 'id', example: 1, type: Number })
  async getByIdController(@Param('id') id: number) {
    const response = await this.roleService.getById(id);
    return response;
  }

  @Post()
  @ApiOperation({ summary: 'Tạo vai trò' })
  async createRole(@Body() dto: RoleDto) {
    const response = await this.roleService.saveRole(dto);
    return response;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật vai trò' })
  @ApiParam({ name: 'id', example: 1, type: Number })
  async updateRoleController(@Param('id') id: number, @Body() dto: RoleDto) {
    const response = await this.roleService.saveRole(dto, id);
    return response;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa vai trò' })
  @ApiParam({ name: 'id', example: 1, type: Number })
  async removeRoleController(@Param('id') id: number) {
    const response = await this.roleService.removeRole(id);
    return response;
  }
}
