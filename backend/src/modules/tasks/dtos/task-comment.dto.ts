import { Transform } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const COMMENT_CONTENT_TYPES = ['html', 'markdown'] as const;

export class CreateTaskCommentDto {
  @ApiProperty({ example: '<p>Đã xử lý xong phần API</p>', maxLength: 50000 })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(50000)
  content: string;

  @ApiPropertyOptional({ enum: COMMENT_CONTENT_TYPES, default: 'html' })
  @IsOptional()
  @IsIn(COMMENT_CONTENT_TYPES)
  contentType?: (typeof COMMENT_CONTENT_TYPES)[number];

  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    description: 'Trả lời comment khác (chỉ lồng 1 cấp)',
  })
  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsInt()
  @Min(1)
  parentId?: number | null;
}

export class UpdateTaskCommentDto {
  @ApiProperty({ maxLength: 50000 })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(50000)
  content: string;
}
