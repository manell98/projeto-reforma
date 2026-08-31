import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrigemDataCaptura, Prisma, RegistroObra } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRegistroObraDto } from './dto/create-registro-obra.dto';
import { UpdateRegistroObraDto } from './dto/update-registro-obra.dto';
import { FilterRegistrosObraDto } from './dto/filter-registros-obra.dto';
import {
  MIDIAS_SUPORTADAS,
  SUBDIRETORIO_EVOLUCAO,
  formatarMegabytes,
  resolverDiretorioEvolucao,
} from './midia.constants';

export type SerializedRegistroObra = Omit<
  RegistroObra,
  'arquivoPath' | 'dataCaptura' | 'createdAt' | 'updatedAt'
> & {
  /** Data de calendário da captura, em UTC-meia-noite (igual a Expense.data). */
  dataCaptura: string;
  /** Instante real do upload — timestamp, não data de calendário. */
  createdAt: string;
  updatedAt: string;
  /** Caminho relativo do arquivo na API; o frontend concatena com apiUrl. */
  url: string;
};

@Injectable()
export class EvolucaoService {
  private readonly diretorio: string;

  constructor(
    private readonly prisma: PrismaService,
    configService: ConfigService,
  ) {
    this.diretorio = resolverDiretorioEvolucao(
      configService.get<string>('upload.dir') ?? './uploads',
    );
  }

  async criar(
    arquivo: Express.Multer.File,
    dto: CreateRegistroObraDto,
  ): Promise<SerializedRegistroObra> {
    const midia = MIDIAS_SUPORTADAS[arquivo.mimetype];

    // O limite do multer é o do vídeo (o maior); o teto por tipo é conferido
    // aqui, já com o arquivo em disco — se estourar, o arquivo é removido.
    if (arquivo.size > midia.limiteBytes) {
      this.apagarArquivo(arquivo.filename);
      throw new BadRequestException(
        `Arquivo muito grande. O tamanho máximo para ${
          midia.tipo === 'FOTO' ? 'fotos' : 'vídeos'
        } é ${formatarMegabytes(midia.limiteBytes)}.`,
      );
    }

    const registro = await this.prisma.registroObra.create({
      data: {
        titulo: dto.titulo,
        descricao: dto.descricao,
        tipo: midia.tipo,
        arquivoNome: arquivo.originalname,
        arquivoPath: `${SUBDIRETORIO_EVOLUCAO}/${arquivo.filename}`,
        mimeType: arquivo.mimetype,
        tamanhoBytes: arquivo.size,
        dataCaptura: new Date(dto.dataCaptura),
        origemDataCaptura: dto.origemDataCaptura,
      },
    });

    return this.serialize(registro);
  }

  async listar(
    filtros: FilterRegistrosObraDto,
  ): Promise<SerializedRegistroObra[]> {
    const where: Prisma.RegistroObraWhereInput = {};

    if (filtros.tipo) {
      where.tipo = filtros.tipo;
    }

    if (filtros.dataInicio || filtros.dataFim) {
      where.dataCaptura = {
        ...(filtros.dataInicio ? { gte: new Date(filtros.dataInicio) } : {}),
        ...(filtros.dataFim ? { lte: new Date(filtros.dataFim) } : {}),
      };
    }

    const registros = await this.prisma.registroObra.findMany({
      where,
      orderBy: [{ dataCaptura: 'desc' }, { createdAt: 'desc' }],
    });

    return registros.map((registro) => this.serialize(registro));
  }

  async obterUm(id: string): Promise<SerializedRegistroObra> {
    return this.serialize(await this.buscar(id));
  }

  /** Dados que o controller precisa para devolver o arquivo pelo Express. */
  async localizarArquivo(
    id: string,
  ): Promise<{ caminhoAbsoluto: string; mimeType: string }> {
    const registro = await this.buscar(id);
    return {
      caminhoAbsoluto: this.caminhoAbsoluto(registro.arquivoPath),
      mimeType: registro.mimeType,
    };
  }

  async atualizar(
    id: string,
    dto: UpdateRegistroObraDto,
  ): Promise<SerializedRegistroObra> {
    const atual = await this.buscar(id);

    // Corrigir a data de captura à mão passa a origem para MANUAL: a data
    // exibida deixou de ser a detectada no EXIF/no arquivo.
    const dataCaptura =
      dto.dataCaptura !== undefined ? new Date(dto.dataCaptura) : null;
    const alterouData =
      dataCaptura !== null &&
      dataCaptura.getTime() !== atual.dataCaptura.getTime();

    const registro = await this.prisma.registroObra.update({
      where: { id },
      data: {
        ...(dto.titulo !== undefined ? { titulo: dto.titulo } : {}),
        ...(dto.descricao !== undefined ? { descricao: dto.descricao } : {}),
        ...(alterouData
          ? {
              dataCaptura,
              origemDataCaptura: OrigemDataCaptura.MANUAL,
            }
          : {}),
      },
    });

    return this.serialize(registro);
  }

  async remover(id: string): Promise<void> {
    const registro = await this.buscar(id);
    await this.prisma.registroObra.delete({ where: { id } });
    this.apagarArquivo(registro.arquivoPath);
  }

  private async buscar(id: string): Promise<RegistroObra> {
    const registro = await this.prisma.registroObra.findUnique({
      where: { id },
    });
    if (!registro) {
      throw new NotFoundException(`Registro ${id} não encontrado`);
    }
    return registro;
  }

  // Só o basename do caminho gravado é usado: assim o arquivo resolvido está
  // sempre dentro de UPLOAD_DIR/evolucao, sem chance de escapar do diretório.
  private caminhoAbsoluto(arquivoPath: string): string {
    return path.join(this.diretorio, path.basename(arquivoPath));
  }

  private apagarArquivo(arquivoPath: string): void {
    fs.rmSync(this.caminhoAbsoluto(arquivoPath), { force: true });
  }

  // `arquivoPath` fica de fora da resposta de propósito: o caminho em disco é
  // detalhe interno, o cliente chega no arquivo apenas pela `url`.
  private serialize(registro: RegistroObra): SerializedRegistroObra {
    return {
      id: registro.id,
      titulo: registro.titulo,
      descricao: registro.descricao,
      tipo: registro.tipo,
      arquivoNome: registro.arquivoNome,
      mimeType: registro.mimeType,
      tamanhoBytes: registro.tamanhoBytes,
      origemDataCaptura: registro.origemDataCaptura,
      dataCaptura: registro.dataCaptura.toISOString(),
      createdAt: registro.createdAt.toISOString(),
      updatedAt: registro.updatedAt.toISOString(),
      url: `/evolucao/registros/${registro.id}/arquivo`,
    };
  }
}
