import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginanteRequest } from '../../../common/requests/index.js';

export class RoleDto {
  @ApiProperty({ example: 'Quản trị viên' })
  @IsString({ message: 'Tên vai trò phải là chuỗi ký tự.' })
  @IsNotEmpty({ message: 'Vui lòng nhập tên vai trò.' })
  @MaxLength(255, { message: 'Tên vai trò không được vượt quá 255 ký tự.' })
  name: string;

  @ApiPropertyOptional({ example: 'Quản lý người dùng và phân quyền' })
  @IsOptional()
  @IsString({ message: 'Mô tả phải là chuỗi ký tự.' })
  description?: string;
}

export class RoleRequest extends PaginanteRequest {
  @IsOptional()
  @IsString()
  name?: string;
}
