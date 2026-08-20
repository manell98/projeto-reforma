import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class UpdateObraDto {
  @ApiPropertyOptional({ example: '2026-04-15' })
  @IsOptional()
  @IsDateString()
  dataInicio?: string | null;

  @ApiPropertyOptional({ example: '2026-10-14' })
  @IsOptional()
  @IsDateString()
  dataTermino?: string | null;
}
