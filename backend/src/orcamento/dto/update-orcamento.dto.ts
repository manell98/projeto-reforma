import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';

export class UpdateOrcamentoDto {
  @ApiProperty({ example: 100000, description: 'Valor do orçamento, em reais' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  valor: number;
}
