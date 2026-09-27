import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, ArrayUnique, IsArray, IsUUID } from 'class-validator';

/**
 * Nova ordem manual (arrastar-e-soltar) de um álbum: a lista COMPLETA de ids
 * dos registros daquele dia, na ordem desejada. Sempre o dia inteiro de uma
 * vez — nunca só os itens que mudaram de posição — para que `ordem` nunca
 * fique parcialmente preenchida dentro de um mesmo dia (ver comentário em
 * schema.prisma).
 */
export class ReordenarRegistrosObraDto {
  @ApiProperty({
    type: [String],
    example: [
      '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      'a3c2c9c9-1b2b-4c3d-8e4f-5a6b7c8d9e0f',
    ],
    description: 'Ids de todos os registros do dia, na nova ordem desejada',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  ids: string[];
}
