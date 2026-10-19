import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import type { TaskPriority } from '../entities/task.entity.js';
import { PaginanteRequest } from '../../../common/requests/paginate.request.js';

export class CreateTaskDto {
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
    description: 'Mặc định: trạng thái todo của workspace',
  })
  @ValidateIf((_, value) => value !== undefined)
  @IsInt()
  @Min(1)
  statusId?: number;

  @ApiPropertyOptional({ type: Number, nullable: true })
  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsInt()
  @Min(1)
  assigneeId?: number | null;

  @ApiPropertyOptional({
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
  })
  @ValidateIf((_, value) => value !== undefined)
  @IsIn(['low', 'medium', 'high', 'urgent'])
  priority?: TaskPriority;

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

  @ApiPropertyOptional()
  @ValidateIf((_, value) => value !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  assigneeId?: number;

  @ApiPropertyOptional({ enum: ['low', 'medium', 'high', 'urgent'] })
  @ValidateIf((_, value) => value !== undefined)
  @IsIn(['low', 'medium', 'high', 'urgent'])
  priority?: TaskPriority;
}
