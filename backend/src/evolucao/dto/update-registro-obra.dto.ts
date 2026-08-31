import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Edição pós-upload: só os metadados descritivos e a data de captura. O
 * arquivo em si é imutável — para trocar a mídia, exclui-se o registro e
 * envia-se outro.
 */
export class UpdateRegistroObraDto {
  @ApiPropertyOptional({ example: 'Contrapiso da sala' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  titulo?: string | null;

  @ApiPropertyOptional({ example: 'Concretagem finalizada no fim da tarde' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  descricao?: string | null;

  @ApiPropertyOptional({ example: '2026-08-15' })
  @IsOptional()
  @IsDateString()
  dataCaptura?: string;
}
