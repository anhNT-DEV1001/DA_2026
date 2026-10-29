import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { PaginanteRequest } from '../../../common/requests/paginate.request.js';

export class CreateTaskStatusDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  spaceId: number;

  @ApiProperty({ example: 'in_review', maxLength: 50 })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code: string;

  @ApiProperty({ example: 'Chờ kiểm tra', maxLength: 100 })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isCompleted?: boolean;
}

export class UpdateTaskStatusDto {
  @ApiPropertyOptional({ example: 'Đang xem xét', maxLength: 100 })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isCompleted?: boolean;
}

export class AssignTaskDto {
  @ApiProperty({ description: 'ID của người dùng cần assign vào task' })
  @IsInt()
  @Min(1)
  userId: number;
}

export class CreateTaskDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  spaceId: number;

  @ApiProperty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsString()
  @MaxLength(20000)
  description?: string | null;

  @ApiPropertyOptional({
    description: 'Mặc định: trạng thái todo của space',
  })
  @ValidateIf((_, value) => value !== undefined)
  @IsInt()
  @Min(1)
  statusId?: number;

  @ApiPropertyOptional({
    description: 'Master data value nhóm PRIORITY',
    default: 'PRIORITY002',
  })
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @MaxLength(255)
  priority?: string;

  @ApiPropertyOptional({ type: String, nullable: true, example: '2026-10-20' })
  @ValidateIf((_, value) => value !== undefined && value !== null)
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  startDate?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: '2026-10-22' })
  @ValidateIf((_, value) => value !== undefined && value !== null)
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  dueDate?: string | null;
}

export class UpdateTaskDto extends PartialType(CreateTaskDto, {
  skipNullProperties: false,
}) {}

export class MoveTaskDto {
  @ApiProperty({ description: 'Trạng thái (cột) đích' })
  @IsInt()
  @Min(1)
  statusId: number;

  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    description: 'Đặt ngay sau task này; null = lên đầu cột',
  })
  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsInt()
  @Min(1)
  afterId?: number | null;
}

export class TaskPageQuery extends PaginanteRequest {
  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}

export class TaskListQuery extends TaskPageQuery {
  @ApiPropertyOptional({ description: 'Lọc theo space' })
  @ValidateIf((_, value) => value !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  spaceId?: number;

  @ApiPropertyOptional({ example: '2026-10-01' })
  @ValidateIf((_, value) => value !== undefined)
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  from?: string;

  @ApiPropertyOptional({ example: '2026-10-31' })
  @ValidateIf((_, value) => value !== undefined)
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  to?: string;

  @ApiPropertyOptional()
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @MaxLength(255)
  search?: string;

  @ApiPropertyOptional()
  @ValidateIf((_, value) => value !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  statusId?: number;

  @ApiPropertyOptional({ description: 'Lọc theo người phụ trách' })
  @ValidateIf((_, value) => value !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  assigneeId?: number;

  @ApiPropertyOptional({ description: 'Master data value nhóm PRIORITY' })
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @MaxLength(255)
  priority?: string;

  @ApiPropertyOptional({
    enum: ['newest', 'position'],
    default: 'newest',
    description: 'position: theo thứ tự trên kanban',
  })
  @IsOptional()
  @IsIn(['newest', 'position'])
  sort?: 'newest' | 'position';
}
