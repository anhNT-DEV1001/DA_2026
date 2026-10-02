import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/index.js';
import { UserResponse } from '../../users/dtos/index.js';
import { MasterDataDto } from '../dtos/index.js';
import { MasterDataService } from '../services/index.js';
import { JwtAccessGuard } from '../../auth/guards/index.js';

@ApiTags('Master Data')
@ApiCookieAuth('access-token-cookie')
@Controller('master-data')
export class MasterDataController {
  constructor(private readonly masterDataService: MasterDataService) {}

  @Get('groups/all')
  @ApiOperation({ summary: 'Lấy danh sách nhóm master data' })
  async getAllGroups() {
    return this.masterDataService.getAllGroups();
  }

  @Get(':group')
  @ApiOperation({ summary: 'Lấy danh sách master data theo nhóm' })
  @ApiParam({ name: 'group', example: 'GENDER', type: String })
  async getMasterDataByGroup(@Param('group') group: string) {
    return this.masterDataService.getMasterDataByGroup(group);
  }

  @Post()
  @UseGuards(JwtAccessGuard)
  @ApiOperation({ summary: 'Tạo master data' })
  async createMasterData(
    @Body() dto: MasterDataDto,
    @CurrentUser('user') user?: UserResponse,
  ) {
    return this.masterDataService.saveMasterData(dto, user);
  }

  @Patch(':id')
  @UseGuards(JwtAccessGuard)
  @ApiOperation({ summary: 'Cập nhật master data' })
  @ApiParam({ name: 'id', example: 1, type: Number })
  async updateMasterData(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: MasterDataDto,
    @CurrentUser('user') user?: UserResponse,
  ) {
    return this.masterDataService.saveMasterData(dto, user, id);
  }

  @Delete(':id')
  @UseGuards(JwtAccessGuard)
  @ApiOperation({ summary: 'Xóa master data' })
  @ApiParam({ name: 'id', example: 1, type: Number })
  async removeMasterData(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('user') user?: UserResponse,
  ) {
    return this.masterDataService.removeMasterData(id, user);
  }
}
