import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginanteRequest } from '../../../common/requests/index.js';

export class CreatePermissionDto {
  @ApiProperty({
    example: 'Xem danh sách người dùng',
    description: 'Tên hiển thị của thao tác (Permission)',
  })
  @IsString({ message: 'Tên thao tác phải là chuỗi ký tự.' })
  @IsNotEmpty({ message: 'Vui lòng nhập tên thao tác.' })
  @MaxLength(255, { message: 'Tên thao tác không được vượt quá 255 ký tự.' })
  name: string;

  @ApiProperty({
    example: 'READ',
    description: 'Hành động (READ, CREATE, UPDATE, DELETE, ...)',
  })
  @IsString({ message: 'Hành động phải là chuỗi ký tự.' })
  @IsNotEmpty({ message: 'Vui lòng nhập hành động.' })
  @MaxLength(255, { message: 'Hành động không được vượt quá 255 ký tự.' })
  action: string;

  @ApiProperty({
    example: 1,
    description: 'ID của menu thuộc về',
  })
  @IsInt({ message: 'ID menu phải là số nguyên.' })
  @IsNotEmpty({ message: 'Vui lòng chọn menu liên quan.' })
  @Min(1, { message: 'ID menu phải lớn hơn 0.' })
  menuId: number;

  @ApiProperty({
    example: 'USER_READ',
    description: 'Mã định danh duy nhất của thao tác',
  })
  @IsString({ message: 'Mã thao tác phải là chuỗi ký tự.' })
  @IsNotEmpty({ message: 'Vui lòng nhập mã thao tác (code).' })
  @MaxLength(255, { message: 'Mã thao tác không được vượt quá 255 ký tự.' })
  code: string;
}

export class UpdatePermissionDto extends PartialType(CreatePermissionDto) {}

export class PermissionDto extends CreatePermissionDto {}

export class PermissionRequest extends PaginanteRequest {
  @ApiPropertyOptional({ description: 'Lọc theo tên thao tác' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Lọc theo mã thao tác (code)' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({ description: 'Lọc theo hành động (action)' })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({ description: 'Lọc theo ID menu' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  menuId?: number;
}
