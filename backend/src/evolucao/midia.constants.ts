import { TipoMidia } from '@prisma/client';
import * as path from 'path';

/**
 * Subdiretório, dentro de UPLOAD_DIR, onde ficam os arquivos da evolução da
 * obra. Todo caminho em disco é montado a partir dele — o nome enviado pelo
 * usuário nunca entra na composição do caminho.
 */
export const SUBDIRETORIO_EVOLUCAO = 'evolucao';

export const TAMANHO_MAXIMO_FOTO_BYTES = 25 * 1024 * 1024;
export const TAMANHO_MAXIMO_VIDEO_BYTES = 200 * 1024 * 1024;

export interface MidiaSuportada {
  tipo: TipoMidia;
  /** Extensão gravada em disco, derivada do mime — nunca do nome original. */
  extensao: string;
  limiteBytes: number;
}

export const MIDIAS_SUPORTADAS: Record<string, MidiaSuportada> = {
  'image/jpeg': {
    tipo: TipoMidia.FOTO,
    extensao: '.jpg',
    limiteBytes: TAMANHO_MAXIMO_FOTO_BYTES,
  },
  'image/png': {
    tipo: TipoMidia.FOTO,
    extensao: '.png',
    limiteBytes: TAMANHO_MAXIMO_FOTO_BYTES,
  },
  'image/webp': {
    tipo: TipoMidia.FOTO,
    extensao: '.webp',
    limiteBytes: TAMANHO_MAXIMO_FOTO_BYTES,
  },
  'image/heic': {
    tipo: TipoMidia.FOTO,
    extensao: '.heic',
    limiteBytes: TAMANHO_MAXIMO_FOTO_BYTES,
  },
  'video/mp4': {
    tipo: TipoMidia.VIDEO,
    extensao: '.mp4',
    limiteBytes: TAMANHO_MAXIMO_VIDEO_BYTES,
  },
  'video/quicktime': {
    tipo: TipoMidia.VIDEO,
    extensao: '.mov',
    limiteBytes: TAMANHO_MAXIMO_VIDEO_BYTES,
  },
  'video/webm': {
    tipo: TipoMidia.VIDEO,
    extensao: '.webm',
    limiteBytes: TAMANHO_MAXIMO_VIDEO_BYTES,
  },
};

export const MIMES_SUPORTADOS = Object.keys(MIDIAS_SUPORTADAS);

export function resolverDiretorioEvolucao(uploadDir: string): string {
  return path.resolve(uploadDir, SUBDIRETORIO_EVOLUCAO);
}

export function formatarMegabytes(bytes: number): string {
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}
