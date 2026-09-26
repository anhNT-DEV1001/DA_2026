import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateMasterDataDto {
  @ApiProperty({
    example: 'GENDER',
    description: 'Nhóm (group) của danh mục dữ liệu master',
  })
  @IsString({ message: 'Group phải là chuỗi ký tự.' })
  @IsNotEmpty({ message: 'Vui lòng nhập group.' })
  @MaxLength(255, { message: 'Group không được vượt quá 255 ký tự.' })
  group: string;

  @ApiProperty({
    example: 'MALE',
    description: 'Mã khóa (key) độc nhất trong nhóm',
  })
  @ApiPropertyOptional({
    example: '1',
    description: 'Giá trị (value) đi kèm của master data',
  })
  @IsOptional()
  @IsString({ message: 'Value phải là chuỗi ký tự.' })
  value?: string;

  @ApiPropertyOptional({
    example: 'Nam',
    description: 'Tên hiển thị của danh mục',
  })
  @IsOptional()
  @IsString({ message: 'Tên phải là chuỗi ký tự.' })
  @MaxLength(255, { message: 'Tên không được vượt quá 255 ký tự.' })
  name?: string;

  @ApiPropertyOptional({
    example: 'Giới tính Nam',
    description: 'Mô tả chi tiết',
  })
  @IsOptional()
  @IsString({ message: 'Mô tả phải là chuỗi ký tự.' })
  description?: string;

  @ApiPropertyOptional({
    example: 0,
    description: 'Thứ tự hiển thị',
    default: 0,
  })
  @IsOptional()
  @IsInt({ message: 'Thứ tự hiển thị phải là số nguyên.' })
  @Min(0, { message: 'Thứ tự hiển thị phải lớn hơn hoặc bằng 0.' })
  displayOrder?: number;
}

export class UpdateMasterDataDto extends PartialType(CreateMasterDataDto) {}

export class MasterDataDto extends CreateMasterDataDto {}

export class FilterMasterDataDto {
  @ApiPropertyOptional({
    example: 'GENDER',
    description: 'Lọc theo nhóm (group)',
  })
  @IsOptional()
  @IsString()
  group?: string;

  @ApiPropertyOptional({
    example: 'MALE',
    description: 'Lọc theo mã khóa (key)',
  })
  @IsOptional()
  @IsString()
  key?: string;

  @ApiPropertyOptional({
    example: 'Nam',
    description: 'Từ khóa tìm kiếm theo tên hoặc mô tả',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
