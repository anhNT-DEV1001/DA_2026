import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const MESSAGE_CONTENT_TYPES = ['markdown', 'html', 'text'] as const;
export const MAX_MESSAGE_LENGTH = 20000;

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class SendMessageDto {
  @ApiPropertyOptional({
    example: 'Mọi người xem giúp PR này nhé',
    maxLength: MAX_MESSAGE_LENGTH,
    description: 'Có thể bỏ trống nếu có file đính kèm',
  })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(MAX_MESSAGE_LENGTH)
  content?: string;

  @ApiPropertyOptional({ enum: MESSAGE_CONTENT_TYPES, default: 'markdown' })
  @IsOptional()
  @IsIn(MESSAGE_CONTENT_TYPES)
  contentType?: (typeof MESSAGE_CONTENT_TYPES)[number];

  @ApiPropertyOptional({ type: Number, nullable: true, description: 'Trả lời trong thread của tin gốc' })
  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsInt()
  @Min(1)
  parentId?: number | null;

  @ApiPropertyOptional({ description: 'UUID do client sinh; gửi lại cùng giá trị không tạo tin trùng' })
  @IsOptional()
  @IsUUID()
  clientMessageId?: string;

  @ApiPropertyOptional({ type: [Number], description: 'Người được @nhắc' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsInt({ each: true })
  @Min(1, { each: true })
  mentionUserIds?: number[];

  @ApiPropertyOptional({ type: [Number], description: 'ID file đã upload qua API attachments' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsInt({ each: true })
  @Min(1, { each: true })
  attachmentIds?: number[];
}

export class UpdateMessageDto {
  @ApiProperty({ maxLength: MAX_MESSAGE_LENGTH })
  @Transform(trim)
  @IsString()
  @MaxLength(MAX_MESSAGE_LENGTH)
  content: string;

  @ApiPropertyOptional({ type: [Number], description: 'Thay toàn bộ danh sách người được nhắc' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsInt({ each: true })
  @Min(1, { each: true })
  mentionUserIds?: number[];
}

/** Cursor theo id: `before` lấy tin cũ hơn, `after` lấy tin mới hơn */
export class MessageCursorQuery {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  before?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  after?: number;

  @ApiPropertyOptional({ default: 30, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 30;

  @ApiPropertyOptional({ description: 'Tìm theo nội dung (chỉ áp dụng cho danh sách tin gốc)' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(255)
  search?: string;
}

export class ReactionDto {
  @ApiProperty({ example: '👍', maxLength: 32 })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  emoji: string;
}
