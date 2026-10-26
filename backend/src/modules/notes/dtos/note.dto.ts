import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginanteRequest } from '../../../common/requests/index.js';
import { NOTE_COLORS, type NoteColor } from '../entities/index.js';

export class CreateNoteDto {
  @ApiPropertyOptional({
    example: '<p>Họp nhóm lúc <strong>9h</strong></p>',
    description: 'Nội dung ghi chú (HTML)',
    default: '',
  })
  @IsOptional()
  @IsString({ message: 'Nội dung ghi chú phải là chuỗi ký tự.' })
  @MaxLength(20000, {
    message: 'Nội dung ghi chú không được vượt quá 20000 ký tự.',
  })
  content?: string;

  @ApiPropertyOptional({
    example: 'Họp nhóm lúc 9h',
    description:
      'Nội dung dạng text thuần (editor.getText()). Bỏ trống thì server tự tách từ content',
  })
  @IsOptional()
  @IsString({ message: 'Nội dung text phải là chuỗi ký tự.' })
  @MaxLength(20000, {
    message: 'Nội dung text không được vượt quá 20000 ký tự.',
  })
  contentText?: string;

  @ApiPropertyOptional({
    example: 'yellow',
    description: 'Màu ghi chú',
    enum: NOTE_COLORS,
    default: 'yellow',
  })
  @IsOptional()
  @IsIn(NOTE_COLORS, {
    message: `Màu ghi chú phải là một trong: ${NOTE_COLORS.join(', ')}.`,
  })
  color?: NoteColor;
}

export class UpdateNoteDto extends PartialType(CreateNoteDto) {}

export class NoteRequest extends PaginanteRequest {
  @ApiPropertyOptional({
    example: 'họp nhóm',
    description: 'Từ khóa tìm kiếm theo nội dung ghi chú',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
