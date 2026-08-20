import { ApiPropertyOptional } from '@nestjs/swagger';
import { Categoria } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

export class FilterExpensesDto {
  @ApiPropertyOptional({ example: '2026-08-01' })
  @IsOptional()
  @IsDateString()
  dataInicio?: string;

  @ApiPropertyOptional({ example: '2026-08-31' })
  @IsOptional()
  @IsDateString()
  dataFim?: string;

  @ApiPropertyOptional({ enum: Categoria })
  @IsOptional()
  @IsEnum(Categoria)
  categoria?: Categoria;

  @ApiPropertyOptional({ example: 'cimento' })
  @IsOptional()
  @IsString()
  descricao?: string;
}
