import { ApiPropertyOptional } from '@nestjs/swagger';
import { TipoMidia } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional } from 'class-validator';

export class FilterRegistrosObraDto {
  @ApiPropertyOptional({ example: '2026-08-01' })
  @IsOptional()
  @IsDateString()
  dataInicio?: string;

  @ApiPropertyOptional({ example: '2026-08-31' })
  @IsOptional()
  @IsDateString()
  dataFim?: string;

  @ApiPropertyOptional({ enum: TipoMidia })
  @IsOptional()
  @IsEnum(TipoMidia)
  tipo?: TipoMidia;
}
