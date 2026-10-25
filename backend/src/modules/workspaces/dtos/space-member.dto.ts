import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginanteRequest } from '../../../common/requests/index.js';

export class AddSpaceMemberDto {
  @ApiProperty({ description: 'ID người dùng cần thêm vào space', example: 1 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  userId: number;
}

export class SpaceMemberRequest extends PaginanteRequest {
  @ApiPropertyOptional({ description: 'Tìm kiếm theo tên hoặc email', example: 'nguyen' })
  @IsOptional()
  @IsString()
  search?: string;
}

export class SpaceMemberDto {
  userId: number;
  workspaceMemberId: number;
}

export class SpaceMemberResponse {
  id: number;
  spaceId: number;
  workspaceMemberId: number;
  workspaceMember?: unknown;
}
