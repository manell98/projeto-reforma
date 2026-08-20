import { Injectable } from '@nestjs/common';
import { OrcamentoTipo } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateOrcamentoDto } from './dto/update-orcamento.dto';

export interface OrcamentoResponse {
  tipo: OrcamentoTipo;
  valor: number;
}

@Injectable()
export class OrcamentoService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(): Promise<OrcamentoResponse[]> {
    const registros = await this.prisma.orcamento.findMany();
    const valores = new Map(registros.map((r) => [r.tipo, Number(r.valor)]));
    return Object.values(OrcamentoTipo).map((tipo) => ({
      tipo,
      valor: valores.get(tipo) ?? 0,
    }));
  }

  async atualizar(
    tipo: OrcamentoTipo,
    dto: UpdateOrcamentoDto,
  ): Promise<OrcamentoResponse> {
    const registro = await this.prisma.orcamento.upsert({
      where: { tipo },
      create: { tipo, valor: dto.valor },
      update: { valor: dto.valor },
    });
    return { tipo: registro.tipo, valor: Number(registro.valor) };
  }
}
