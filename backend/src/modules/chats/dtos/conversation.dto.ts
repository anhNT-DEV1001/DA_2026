import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginanteRequest } from '../../../common/requests/paginate.request.js';

/** Tính cả người tạo */
export const MAX_DIRECT_MEMBERS = 10;

export class OpenDirectConversationDto {
  @ApiProperty({
    type: [Number],
    example: [2],
    description: `Thành viên workspace muốn chat cùng (không cần gồm bản thân), tối đa ${MAX_DIRECT_MEMBERS - 1}`,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_DIRECT_MEMBERS - 1)
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  userIds: number[];

  @ApiPropertyOptional({ example: 'Nhóm thiết kế', description: 'Chỉ dùng cho nhóm từ 3 người' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(255)
  name?: string;
}

export class UpdateConversationPreferencesDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  muted?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  pinned?: boolean;
}

export class MarkConversationReadDto {
  @ApiPropertyOptional({ description: 'Đọc tới tin này; bỏ trống = tin mới nhất' })
  @IsOptional()
  @IsInt()
  @Min(1)
  messageId?: number;
}

export class ChatPageQuery extends PaginanteRequest {
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
