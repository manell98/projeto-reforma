import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Categoria, FormaPagamento } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateExpenseDto {
  @ApiProperty({ example: 149.9, description: 'Valor gasto, em reais' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Min(0.01)
  valor: number;

  @ApiProperty({ example: 'Sacos de cimento CP-II' })
  @IsString()
  @MaxLength(200)
  descricao: string;

  @ApiProperty({ enum: Categoria, example: Categoria.MATERIAIS })
  @IsEnum(Categoria)
  categoria: Categoria;

  @ApiProperty({ example: '2026-08-15' })
  @IsDateString()
  data: string;

  @ApiProperty({ required: false, example: 'Comprado na loja X, à vista' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  observacao?: string;

  @ApiProperty({ enum: FormaPagamento, example: FormaPagamento.PIX })
  @IsEnum(FormaPagamento)
  formaPagamento: FormaPagamento;

  @ApiPropertyOptional({
    example: 3,
    minimum: 1,
    maximum: 12,
    description:
      'Obrigatório quando formaPagamento for CARTAO_CREDITO; ignorado quando for PIX',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  parcelas?: number;
}
