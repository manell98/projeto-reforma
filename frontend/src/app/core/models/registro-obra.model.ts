export type TipoMidia = 'FOTO' | 'VIDEO';

// De onde veio a data de captura mostrada na timeline: dos metadados EXIF da
// própria foto, da data de modificação do arquivo, ou digitada pelo usuário.
export type OrigemDataCaptura = 'EXIF' | 'ARQUIVO' | 'MANUAL';

export interface RegistroObra {
  id: string;
  titulo: string | null;
  descricao: string | null;
  tipo: TipoMidia;
  arquivoNome: string;
  mimeType: string;
  tamanhoBytes: number;
  /** Quando a foto/vídeo foi tirada — data de calendário (UTC-meia-noite). */
  dataCaptura: string;
  origemDataCaptura: OrigemDataCaptura;
  /** Caminho do arquivo na API, relativo à apiUrl. */
  url: string;
  /** Instante do upload — timestamp real, exibido em horário local. */
  createdAt: string;
  updatedAt: string;
}

export interface NovoRegistroObra {
  arquivo: File;
  titulo: string | null;
  descricao: string | null;
  dataCaptura: string;
  origemDataCaptura: OrigemDataCaptura;
}

export interface AtualizacaoRegistroObra {
  titulo: string | null;
  descricao: string | null;
  dataCaptura: string;
}

export const ORIGEM_DATA_CAPTURA_LABELS: Record<OrigemDataCaptura, string> = {
  EXIF: 'Data original da foto (EXIF)',
  ARQUIVO: 'Data do arquivo',
  MANUAL: 'Data informada manualmente',
};

// Versão curta e sem jargão da origem, para caber junto da data no card da
// galeria — o rótulo completo acima continua sendo o texto do tooltip.
export const ORIGEM_DATA_CAPTURA_RESUMO: Record<OrigemDataCaptura, string> = {
  EXIF: 'data detectada na foto',
  ARQUIVO: 'data do arquivo',
  MANUAL: 'data informada por você',
};

export const ORIGEM_DATA_CAPTURA_ICONES: Record<OrigemDataCaptura, string> = {
  EXIF: 'auto_awesome',
  ARQUIVO: 'insert_drive_file',
  MANUAL: 'edit_calendar',
};
