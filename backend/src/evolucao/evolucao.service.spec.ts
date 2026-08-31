import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import * as fs from 'fs';
import * as path from 'path';
import { OrigemDataCaptura, RegistroObra, TipoMidia } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EvolucaoService } from './evolucao.service';
import { TAMANHO_MAXIMO_FOTO_BYTES } from './midia.constants';

const UPLOAD_DIR = path.resolve('/tmp/reforma-uploads-teste');

// PrismaService é totalmente mockado: nenhum teste toca o banco real.
const prismaMock = {
  registroObra: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

const registroFake: RegistroObra = {
  id: 'reg-1',
  titulo: 'Contrapiso da sala',
  descricao: null,
  tipo: TipoMidia.FOTO,
  arquivoNome: 'IMG_0001.JPG',
  arquivoPath: 'evolucao/abc.jpg',
  mimeType: 'image/jpeg',
  tamanhoBytes: 1024,
  dataCaptura: new Date('2026-08-15T00:00:00.000Z'),
  origemDataCaptura: OrigemDataCaptura.EXIF,
  createdAt: new Date('2026-08-20T13:45:00.000Z'),
  updatedAt: new Date('2026-08-20T13:45:00.000Z'),
};

function arquivoFake(
  parcial: Partial<Express.Multer.File> = {},
): Express.Multer.File {
  return {
    fieldname: 'arquivo',
    originalname: 'IMG_0001.JPG',
    mimetype: 'image/jpeg',
    filename: 'abc.jpg',
    size: 1024,
    ...parcial,
  } as Express.Multer.File;
}

describe('EvolucaoService', () => {
  let service: EvolucaoService;
  let rmSync: jest.SpyInstance;

  beforeEach(async () => {
    jest.clearAllMocks();
    rmSync = jest.spyOn(fs, 'rmSync').mockImplementation(() => undefined);

    const moduleRef = await Test.createTestingModule({
      providers: [
        EvolucaoService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: ConfigService, useValue: { get: () => UPLOAD_DIR } },
      ],
    }).compile();

    service = moduleRef.get(EvolucaoService);
  });

  afterEach(() => rmSync.mockRestore());

  it('deriva o tipo da mídia pelo mime e guarda o nome original só como metadado', async () => {
    prismaMock.registroObra.create.mockResolvedValue(registroFake);

    await service.criar(arquivoFake(), {
      titulo: 'Contrapiso da sala',
      dataCaptura: '2026-08-15',
      origemDataCaptura: OrigemDataCaptura.EXIF,
    });

    expect(prismaMock.registroObra.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tipo: TipoMidia.FOTO,
        arquivoNome: 'IMG_0001.JPG',
        arquivoPath: 'evolucao/abc.jpg',
        dataCaptura: new Date('2026-08-15'),
        origemDataCaptura: OrigemDataCaptura.EXIF,
      }),
    });
  });

  it('serializa datas em ISO, expõe a url do arquivo e omite o caminho em disco', async () => {
    prismaMock.registroObra.findUnique.mockResolvedValue(registroFake);

    const registro = await service.obterUm('reg-1');

    expect(registro.dataCaptura).toBe('2026-08-15T00:00:00.000Z');
    expect(registro.createdAt).toBe('2026-08-20T13:45:00.000Z');
    expect(registro.url).toBe('/evolucao/registros/reg-1/arquivo');
    expect(registro).not.toHaveProperty('arquivoPath');
  });

  it('recusa foto acima do limite e remove o arquivo já gravado', async () => {
    const grande = arquivoFake({ size: TAMANHO_MAXIMO_FOTO_BYTES + 1 });

    await expect(
      service.criar(grande, {
        dataCaptura: '2026-08-15',
        origemDataCaptura: OrigemDataCaptura.ARQUIVO,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prismaMock.registroObra.create).not.toHaveBeenCalled();
    expect(rmSync).toHaveBeenCalledWith(
      path.join(UPLOAD_DIR, 'evolucao', 'abc.jpg'),
      { force: true },
    );
  });

  it('monta o filtro por período e tipo e ordena do mais recente para o mais antigo', async () => {
    prismaMock.registroObra.findMany.mockResolvedValue([registroFake]);

    await service.listar({
      dataInicio: '2026-08-01',
      dataFim: '2026-08-31',
      tipo: TipoMidia.VIDEO,
    });

    expect(prismaMock.registroObra.findMany).toHaveBeenCalledWith({
      where: {
        tipo: TipoMidia.VIDEO,
        dataCaptura: {
          gte: new Date('2026-08-01'),
          lte: new Date('2026-08-31'),
        },
      },
      orderBy: [{ dataCaptura: 'desc' }, { createdAt: 'desc' }],
    });
  });

  it('apaga a linha e o arquivo, sempre dentro do diretório de uploads', async () => {
    prismaMock.registroObra.findUnique.mockResolvedValue({
      ...registroFake,
      arquivoPath: '../../fora/abc.jpg',
    });

    await service.remover('reg-1');

    expect(prismaMock.registroObra.delete).toHaveBeenCalledWith({
      where: { id: 'reg-1' },
    });
    expect(rmSync).toHaveBeenCalledWith(
      path.join(UPLOAD_DIR, 'evolucao', 'abc.jpg'),
      { force: true },
    );
  });

  it('marca a origem como MANUAL quando a data de captura é corrigida à mão', async () => {
    prismaMock.registroObra.findUnique.mockResolvedValue(registroFake);
    prismaMock.registroObra.update.mockResolvedValue(registroFake);

    await service.atualizar('reg-1', { dataCaptura: '2026-08-10' });

    expect(prismaMock.registroObra.update).toHaveBeenCalledWith({
      where: { id: 'reg-1' },
      data: {
        dataCaptura: new Date('2026-08-10'),
        origemDataCaptura: OrigemDataCaptura.MANUAL,
      },
    });
  });

  it('mantém a origem original quando só o título muda', async () => {
    prismaMock.registroObra.findUnique.mockResolvedValue(registroFake);
    prismaMock.registroObra.update.mockResolvedValue(registroFake);

    await service.atualizar('reg-1', {
      titulo: 'Novo título',
      dataCaptura: '2026-08-15',
    });

    expect(prismaMock.registroObra.update).toHaveBeenCalledWith({
      where: { id: 'reg-1' },
      data: { titulo: 'Novo título' },
    });
  });

  it('devolve 404 quando o registro não existe', async () => {
    prismaMock.registroObra.findUnique.mockResolvedValue(null);

    await expect(service.obterUm('nao-existe')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
