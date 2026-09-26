import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
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
    description: 'Tên không gian làm việc',
  })
  @IsString({ message: 'Tên workspace phải là chuỗi ký tự.' })
  @IsNotEmpty({ message: 'Vui lòng nhập tên workspace.' })
  @MaxLength(255, { message: 'Tên workspace không được vượt quá 255 ký tự.' })
  name: string;

  @ApiPropertyOptional({
    example: 'Không gian làm việc cho các dự án nội bộ',
    description: 'Mô tả chi tiết về workspace',
  })
  @IsOptional()
  @IsString({ message: 'Mô tả phải là chuỗi ký tự.' })
  @MaxLength(255, { message: 'Mô tả không được vượt quá 255 ký tự.' })
  description?: string;

  @ApiPropertyOptional({
    example: 'workspace-cong-ty-abc',
    description:
      'Đường dẫn định danh duy nhất (slug), có thể tự động sinh từ tên',
  })
  @IsOptional()
  @IsString({ message: 'Slug phải là chuỗi ký tự.' })
  @MaxLength(255, { message: 'Slug không được vượt quá 255 ký tự.' })
  slug?: string;

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
    description: 'Từ khóa tìm kiếm theo tên hoặc slug',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'Lọc theo ID chủ sở hữu',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  ownerId?: number;
}
