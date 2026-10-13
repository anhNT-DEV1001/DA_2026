import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { PaginanteRequest } from '../../../common/requests/index.js';

export class WorkspaceMemberRequest extends PaginanteRequest {
  @ApiPropertyOptional({
    example: 'john',
    description: 'Tìm kiếm theo tên hiển thị, tên đăng nhập hoặc email',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'Lọc theo ID vai trò (role_id)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  roleId?: number;

  @ApiPropertyOptional({
    example: 'active',
    description: 'Lọc theo trạng thái thành viên (ví dụ: active, inactive, pending)',
  })
  @IsOptional()
  @IsString()
  status?: string;
}

export class AddWorkspaceMemberDto {
  @ApiPropertyOptional({
    example: 1,
    description: 'ID người dùng cần thêm vào workspace',
  })
  @Type(() => Number)
  @IsInt({ message: 'User ID phải là số nguyên.' })
  @IsNotEmpty({ message: 'User ID không được để trống.' })
  @Min(1, { message: 'User ID phải lớn hơn 0.' })
  userId: number;

  @ApiPropertyOptional({
    example: 2,
    description: 'ID vai trò gán cho người dùng trong workspace',
  })
  @Type(() => Number)
  @IsInt({ message: 'Role ID phải là số nguyên.' })
  @IsNotEmpty({ message: 'Role ID không được để trống.' })
  @Min(1, { message: 'Role ID phải lớn hơn 0.' })
  roleId: number;

  @ApiPropertyOptional({
    example: 'active',
    description: 'Trạng thái thành viên',
    default: 'active',
  })
  @IsOptional()
  @IsString()
  status?: string;
}

export class UpdateWorkspaceMemberDto {
  @ApiPropertyOptional({
    example: 2,
    description: 'ID vai trò mới',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Role ID phải là số nguyên.' })
  @Min(1, { message: 'Role ID phải lớn hơn 0.' })
  roleId?: number;

  @ApiPropertyOptional({
    example: 'inactive',
    description: 'Trạng thái thành viên mới',
  })
  @IsOptional()
  @IsString()
  status?: string;
}

