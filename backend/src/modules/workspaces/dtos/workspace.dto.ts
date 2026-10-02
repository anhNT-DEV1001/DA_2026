import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaginanteRequest } from '../../../common/requests/index.js';

export class CreateWorkspaceDto {
  @ApiProperty({
    example: 'Không gian làm việc DA 2026',
    description: 'Tên không gian làm việc',
  })
  @IsString({ message: 'Tên workspace phải là chuỗi ký tự.' })
  @IsNotEmpty({ message: 'Vui lòng nhập tên workspace.' })
  @MaxLength(255, { message: 'Tên workspace không được vượt quá 255 ký tự.' })
  name: string;

  @ApiPropertyOptional({
    example: 'Không gian làm việc cho các dự án nội bộ công ty',
    description: 'Mô tả chi tiết về workspace',
  })
  @IsOptional()
  @IsString({ message: 'Mô tả phải là chuỗi ký tự.' })
  @MaxLength(255, { message: 'Mô tả không được vượt quá 255 ký tự.' })
  description?: string;

  @ApiPropertyOptional({
    example: 'workspace-da-2026',
    description:
      'Đường dẫn định danh duy nhất (slug), tự động sinh từ tên nếu để trống',
  })
  @IsOptional()
  @IsString({ message: 'Slug phải là chuỗi ký tự.' })
  @MaxLength(255, { message: 'Slug không được vượt quá 255 ký tự.' })
  slug?: string;

  @ApiPropertyOptional({
    example: 'private',
    enum: ['public', 'private'],
    description: 'Chế độ hiển thị: public hoặc private',
    default: 'private',
  })
  @IsOptional()
  @IsEnum(['public', 'private'], {
    message: 'Chế độ workspace phải là public hoặc private.',
  })
  mode?: 'public' | 'private';

  @ApiPropertyOptional({
    example: 1,
    description: 'ID của chủ sở hữu (mặc định lấy từ tài khoản đang đăng nhập)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Mã chủ sở hữu phải là số nguyên.' })
  @Min(1, { message: 'Mã chủ sở hữu phải lớn hơn 0.' })
  ownerId?: number;
}

export class UpdateWorkspaceDto extends PartialType(CreateWorkspaceDto) {}

export class WorkspaceRequest extends PaginanteRequest {
  @ApiPropertyOptional({
    example: 'Công Ty ABC',
    description: 'Từ khóa tìm kiếm theo tên hoặc slug hoặc mô tả',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    example: 'private',
    enum: ['public', 'private'],
    description: 'Lọc theo chế độ workspace (public / private)',
  })
  @IsOptional()
  @IsEnum(['public', 'private'])
  mode?: 'public' | 'private';

  @ApiPropertyOptional({
    example: 1,
    description: 'Lọc theo ID chủ sở hữu',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  ownerId?: number;
}
