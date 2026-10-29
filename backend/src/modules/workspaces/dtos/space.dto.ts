import {
  ApiProperty,
  ApiPropertyOptional,
  OmitType,
  PartialType,
} from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { PaginanteRequest } from '../../../common/requests/index.js';

export class SpaceStatusDto {
  @ApiProperty({ example: 'TODO', maxLength: 50 })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'Mã trạng thái phải là chuỗi ký tự.' })
  @IsNotEmpty({ message: 'Vui lòng nhập mã trạng thái.' })
  @MaxLength(50, { message: 'Mã trạng thái không được vượt quá 50 ký tự.' })
  code: string;

  @ApiProperty({ example: 'Cần làm', maxLength: 100 })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'Tên trạng thái phải là chuỗi ký tự.' })
  @IsNotEmpty({ message: 'Vui lòng nhập tên trạng thái.' })
  @MaxLength(100, { message: 'Tên trạng thái không được vượt quá 100 ký tự.' })
  name: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isCompleted?: boolean;
}

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
    example: 'LayoutList',
    description: 'Tên icon Lucide; gửi null để xóa icon',
    maxLength: 100,
    nullable: true,
  })
  @IsOptional()
  @IsString({ message: 'Icon phải là chuỗi ký tự.' })
  @MaxLength(100, { message: 'Tên icon không được vượt quá 100 ký tự.' })
  icon?: string | null;

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

  @ApiPropertyOptional({
    type: [SpaceStatusDto],
    description:
      'Trạng thái task ban đầu theo thứ tự hiển thị; bỏ trống thì dùng bộ mặc định',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => SpaceStatusDto)
  statuses?: SpaceStatusDto[];
}

export class UpdateSpaceDto extends PartialType(
  OmitType(CreateSpaceDto, ['statuses'] as const),
) {}

export class SpaceRequest extends PaginanteRequest {
  @ApiPropertyOptional({
    example: 'General',
    description: 'Từ khóa tìm kiếm theo tên hoặc mô tả',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
