import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import { PaginanteRequest } from '../../../common/requests/index.js';

export class NotificationRequest extends PaginanteRequest {
  @ApiPropertyOptional({
    example: false,
    description: 'Chỉ lấy thông báo chưa đọc',
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  unreadOnly?: boolean;
}
