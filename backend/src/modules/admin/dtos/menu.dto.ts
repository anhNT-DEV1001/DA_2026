import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginanteRequest } from '../../../common/requests/index.js';

export class CreateMenuDto {
  @ApiProperty({
    example: 'Quản lý người dùng',
    description: 'Tên hiển thị của menu',
  })
  @IsString({ message: 'Tên menu phải là chuỗi ký tự.' })
  @IsNotEmpty({ message: 'Vui lòng nhập tên menu.' })
  @MaxLength(255, { message: 'Tên menu không được vượt quá 255 ký tự.' })
  name: string;

  @ApiPropertyOptional({
    example: '/admin/users',
    description: 'Đường dẫn (route) điều hướng',
  })
  @IsOptional()
  @IsString({ message: 'Đường dẫn phải là chuỗi ký tự.' })
  @MaxLength(255, { message: 'Đường dẫn không được vượt quá 255 ký tự.' })
  route?: string;

  @ApiPropertyOptional({
    example: 'user-icon',
    description: 'Tên biểu tượng (icon) hiển thị',
  })
  @IsOptional()
  @IsString({ message: 'Icon phải là chuỗi ký tự.' })
  @MaxLength(255, { message: 'Icon không được vượt quá 255 ký tự.' })
  icon?: string;

  @ApiProperty({
    example: 'user_management',
    description: 'Mã định danh (alias) độc nhất của menu',
  })
  @IsString({ message: 'Alias phải là chuỗi ký tự.' })
  @IsNotEmpty({ message: 'Vui lòng nhập alias.' })
  @MaxLength(255, { message: 'Alias không được vượt quá 255 ký tự.' })
  alias: string;

  @ApiPropertyOptional({ example: 1, description: 'ID của menu cha (nếu có)' })
  @IsOptional()
  @IsInt({ message: 'ID menu cha phải là số nguyên.' })
  @Min(1, { message: 'ID menu cha phải lớn hơn 0.' })
  parentId?: number;

  @ApiPropertyOptional({
    example: 0,
    description: 'Thứ tự hiển thị',
    default: 0,
  })
  @IsOptional()
  @IsInt({ message: 'Thứ tự hiển thị phải là số nguyên.' })
  @Min(0, { message: 'Thứ tự hiển thị phải lớn hơn hoặc bằng 0.' })
  displayOrder?: number;

  @ApiPropertyOptional({
    example: true,
    description: 'Trạng thái hiển thị trên Sidebar',
    default: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'Trạng thái hiển thị Sidebar phải là kiểu boolean.' })
  isSideBarDisplay?: boolean;

  @IsOptional()
  isActive: boolean;
}

export class UpdateMenuDto extends PartialType(CreateMenuDto) {}

export class MenuDto extends CreateMenuDto {}

export class MenuRequest extends PaginanteRequest {
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ type: Boolean, description: 'Trạng thái menu' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  isActive?: boolean;
}
