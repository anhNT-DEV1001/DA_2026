import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
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

export class AssignRolePermissionDto {
  @ApiProperty({ example: 1, description: 'ID của Permission' })
  @IsInt({ message: 'ID thao tác phải là số nguyên.' })
  @IsNotEmpty({ message: 'Vui lòng chọn ID thao tác.' })
  permissionId: number;
}

export class UpdateRolePermissionsDto {
  @ApiProperty({
    example: [1, 2, 3],
    description: 'Danh sách ID của các Permission',
  })
  @IsArray({ message: 'Danh sách ID thao tác phải là mảng.' })
  @IsInt({ each: true, message: 'Mỗi ID thao tác phải là số nguyên.' })
  permissionIds: number[];
}
