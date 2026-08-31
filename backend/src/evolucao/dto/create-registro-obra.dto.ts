import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrigemDataCaptura } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/**
 * Campos de texto que acompanham o arquivo no multipart/form-data. O `tipo`
 * (FOTO/VIDEO) não vem do cliente: é derivado do mime do arquivo no servidor.
 */
export class CreateRegistroObraDto {
  @ApiPropertyOptional({ example: 'Contrapiso da sala' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  titulo?: string;

  @ApiPropertyOptional({ example: 'Concretagem finalizada no fim da tarde' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  descricao?: string;

  @ApiProperty({
    example: '2026-08-15',
    description: 'Data em que a foto/vídeo foi capturada (não a do upload)',
  })
  @IsDateString()
  dataCaptura: string;

  @ApiProperty({
    enum: OrigemDataCaptura,
    example: OrigemDataCaptura.EXIF,
    description:
      'De onde veio a data de captura: EXIF da foto, data do arquivo ou digitada pelo usuário',
  })
  @IsEnum(OrigemDataCaptura)
  origemDataCaptura: OrigemDataCaptura;
}
