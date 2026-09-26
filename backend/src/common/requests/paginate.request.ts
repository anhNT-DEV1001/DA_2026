import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class PaginanteRequest {
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;

  get skip(): number {
    return ((this.page ?? 1) - 1) * (this.limit ?? 15);
  }
}
