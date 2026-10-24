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

export class CreateSpaceDto {
  @ApiProperty({
    example: 'General',
    description: 'Tên space',
  })
  @IsString({ message: 'Tên space phải là chuỗi ký tự.' })
  @IsNotEmpty({ message: 'Vui lòng nhập tên space.' })
  @MaxLength(255, { message: 'Tên space không được vượt quá 255 ký tự.' })
  name: string;

  @ApiPropertyOptional({
    example: 'Không gian chung cho toàn workspace',
    description: 'Mô tả space',
  })
  @IsOptional()
  @IsString({ message: 'Mô tả phải là chuỗi ký tự.' })
  description?: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'Thứ tự hiển thị',
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Thứ tự hiển thị phải là số nguyên.' })
  @Min(1)
  displayOrder?: number;
}

export class UpdateSpaceDto extends PartialType(CreateSpaceDto) {}

export class SpaceRequest extends PaginanteRequest {
  @ApiPropertyOptional({
    example: 'General',
    description: 'Từ khóa tìm kiếm theo tên hoặc mô tả',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
