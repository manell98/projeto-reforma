import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateObraDto } from './dto/update-obra.dto';

const OBRA_ID = 1;

export interface ObraResponse {
  dataInicio: string | null;
  dataTermino: string | null;
}

@Injectable()
export class ObraService {
  constructor(private readonly prisma: PrismaService) {}

  async obter(): Promise<ObraResponse> {
    const registro = await this.prisma.obra.findUnique({
      where: { id: OBRA_ID },
    });
    return this.serialize(
      registro?.dataInicio ?? null,
      registro?.dataTermino ?? null,
    );
  }

  async atualizar(dto: UpdateObraDto): Promise<ObraResponse> {
    const atual = await this.prisma.obra.findUnique({ where: { id: OBRA_ID } });

    const dataInicio =
      dto.dataInicio !== undefined
        ? dto.dataInicio === null
          ? null
          : new Date(dto.dataInicio)
        : (atual?.dataInicio ?? null);

    const dataTermino =
      dto.dataTermino !== undefined
        ? dto.dataTermino === null
          ? null
          : new Date(dto.dataTermino)
        : (atual?.dataTermino ?? null);

    const registro = await this.prisma.obra.upsert({
      where: { id: OBRA_ID },
      create: { id: OBRA_ID, dataInicio, dataTermino },
      update: { dataInicio, dataTermino },
    });

    return this.serialize(registro.dataInicio, registro.dataTermino);
  }

  private serialize(
    dataInicio: Date | null,
    dataTermino: Date | null,
  ): ObraResponse {
    return {
      dataInicio: dataInicio ? dataInicio.toISOString() : null,
      dataTermino: dataTermino ? dataTermino.toISOString() : null,
    };
  }
}
