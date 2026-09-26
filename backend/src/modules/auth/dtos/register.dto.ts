import { ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { ArrayUnique, IsArray, IsInt, IsOptional, Min } from 'class-validator';
import { CreateUserDto, transformRoleIds } from '../../users/dtos/index.js';

export class RegisterDto extends OmitType(CreateUserDto, ['roleIds'] as const) {
  @ApiPropertyOptional({
    example: [1],
    type: [Number],
    description:
      'Danh sách ID vai trò. Nếu không truyền, hệ thống sẽ tự động gán vai trò mặc định (USER).',
  })
  @IsOptional()
  @Transform(transformRoleIds)
  @IsArray({ message: 'Danh sách vai trò phải là một mảng.' })
  @ArrayUnique({ message: 'Danh sách vai trò không được trùng lặp.' })
  @IsInt({ each: true, message: 'Mỗi mã vai trò phải là số nguyên.' })
  @Min(1, { each: true, message: 'Mỗi mã vai trò phải lớn hơn 0.' })
  roleIds?: number[];
}
