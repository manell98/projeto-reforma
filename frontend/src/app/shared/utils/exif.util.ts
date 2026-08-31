import { OrigemDataCaptura } from '../../core/models/registro-obra.model';
import { paraIsoLocal } from './duracao.util';

/**
 * Leitor mínimo de EXIF, escrito à mão para não trazer uma biblioteca nova
 * ao bundle. Lê só o que interessa para a evolução da obra: a data em que a
 * foto foi TIRADA (`DateTimeOriginal`), com fallback para `DateTimeDigitized`
 * e `DateTime`.
 *
 * Percorre o JPEG procurando o segmento APP1 (0xFFE1) com o header
 * "Exif\0\0", respeita a endianness declarada no cabeçalho TIFF ("II"/"MM"),
 * lê a IFD0 e, através do ponteiro 0x8769, a Exif SubIFD.
 *
 * É deliberadamente defensivo: qualquer arquivo sem EXIF, truncado ou fora
 * do formato esperado resulta em `null` — nunca em exceção.
 */

const TAG_DATE_TIME = 0x0132;
const TAG_EXIF_SUB_IFD = 0x8769;
const TAG_DATE_TIME_ORIGINAL = 0x9003;
const TAG_DATE_TIME_DIGITIZED = 0x9004;

const TIPO_ASCII = 2;
const TIPO_LONG = 4;

// O bloco EXIF fica sempre no começo do arquivo; ler só o primeiro trecho
// evita carregar dezenas de megabytes de foto na memória do navegador.
const BYTES_LIDOS = 256 * 1024;

interface EntradaIfd {
  tipo: number;
  quantidade: number;
  /** Offset da entrada dentro do DataView (início dos 12 bytes). */
  offsetEntrada: number;
}

export async function extrairDataCapturaExif(
  arquivo: File,
): Promise<string | null> {
  try {
    const buffer = await arquivo.slice(0, BYTES_LIDOS).arrayBuffer();
    return lerDataCaptura(new DataView(buffer));
  } catch {
    return null;
  }
}

function lerDataCaptura(view: DataView): string | null {
  const inicioTiff = localizarBlocoTiff(view);
  if (inicioTiff === null) return null;

  const littleEndian = lerEndianness(view, inicioTiff);
  if (littleEndian === null) return null;

  if (view.getUint16(inicioTiff + 2, littleEndian) !== 42) return null;

  const offsetIfd0 = view.getUint32(inicioTiff + 4, littleEndian);
  const ifd0 = lerIfd(view, inicioTiff, offsetIfd0, littleEndian);

  const ponteiroSubIfd = ifd0.get(TAG_EXIF_SUB_IFD);
  const subIfd =
    ponteiroSubIfd && ponteiroSubIfd.tipo === TIPO_LONG
      ? lerIfd(
          view,
          inicioTiff,
          view.getUint32(ponteiroSubIfd.offsetEntrada + 8, littleEndian),
          littleEndian,
        )
      : new Map<number, EntradaIfd>();

  const candidatos: Array<[Map<number, EntradaIfd>, number]> = [
    [subIfd, TAG_DATE_TIME_ORIGINAL],
    [subIfd, TAG_DATE_TIME_DIGITIZED],
    [ifd0, TAG_DATE_TIME],
  ];

  for (const [ifd, tag] of candidatos) {
    const texto = lerAscii(view, inicioTiff, ifd.get(tag), littleEndian);
    const data = converterDataExif(texto);
    if (data) return data;
  }

  return null;
}

/** Devolve o offset do cabeçalho TIFF dentro do segmento APP1, se houver. */
function localizarBlocoTiff(view: DataView): number | null {
  if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) return null;

  let offset = 2;
  while (offset + 4 <= view.byteLength) {
    const marcador = view.getUint16(offset);
    // 0xFFDA (início dos dados da imagem) encerra a área de metadados.
    if ((marcador & 0xff00) !== 0xff00 || marcador === 0xffda) return null;

    const tamanho = view.getUint16(offset + 2);
    if (marcador === 0xffe1 && ehHeaderExif(view, offset + 4)) {
      return offset + 10;
    }
    offset += 2 + tamanho;
  }

  return null;
}

function ehHeaderExif(view: DataView, offset: number): boolean {
  if (offset + 6 > view.byteLength) return false;
  return (
    view.getUint32(offset) === 0x45786966 && view.getUint16(offset + 4) === 0
  );
}

function lerEndianness(view: DataView, inicioTiff: number): boolean | null {
  if (inicioTiff + 8 > view.byteLength) return null;
  const ordem = view.getUint16(inicioTiff);
  if (ordem === 0x4949) return true;
  if (ordem === 0x4d4d) return false;
  return null;
}

function lerIfd(
  view: DataView,
  inicioTiff: number,
  offsetIfd: number,
  littleEndian: boolean,
): Map<number, EntradaIfd> {
  const entradas = new Map<number, EntradaIfd>();
  const inicio = inicioTiff + offsetIfd;
  if (inicio + 2 > view.byteLength) return entradas;

  const total = view.getUint16(inicio, littleEndian);
  for (let i = 0; i < total; i += 1) {
    const offsetEntrada = inicio + 2 + i * 12;
    if (offsetEntrada + 12 > view.byteLength) break;
    entradas.set(view.getUint16(offsetEntrada, littleEndian), {
      tipo: view.getUint16(offsetEntrada + 2, littleEndian),
      quantidade: view.getUint32(offsetEntrada + 4, littleEndian),
      offsetEntrada,
    });
  }

  return entradas;
}

function lerAscii(
  view: DataView,
  inicioTiff: number,
  entrada: EntradaIfd | undefined,
  littleEndian: boolean,
): string | null {
  if (!entrada || entrada.tipo !== TIPO_ASCII || entrada.quantidade === 0) {
    return null;
  }

  // Valores de até 4 bytes ficam embutidos na própria entrada; acima disso,
  // os 4 bytes finais são um offset relativo ao início do bloco TIFF.
  const offsetValor =
    entrada.quantidade <= 4
      ? entrada.offsetEntrada + 8
      : inicioTiff + view.getUint32(entrada.offsetEntrada + 8, littleEndian);

  if (offsetValor + entrada.quantidade > view.byteLength) return null;

  let texto = '';
  for (let i = 0; i < entrada.quantidade; i += 1) {
    const codigo = view.getUint8(offsetValor + i);
    if (codigo === 0) break;
    texto += String.fromCharCode(codigo);
  }

  return texto;
}

/** Converte "YYYY:MM:DD HH:MM:SS" (formato do EXIF) em "YYYY-MM-DD". */
function converterDataExif(texto: string | null): string | null {
  if (!texto) return null;
  const partes = /^(\d{4}):(\d{2}):(\d{2})/.exec(texto);
  if (!partes) return null;
  const [, ano, mes, dia] = partes;
  if (Number(mes) < 1 || Number(mes) > 12 || Number(dia) < 1 || Number(dia) > 31) {
    return null;
  }
  return `${ano}-${mes}-${dia}`;
}

export interface DataCapturaDetectada {
  /** Data de calendário "YYYY-MM-DD". */
  data: string;
  origem: OrigemDataCaptura;
}

/**
 * Data de captura sugerida para um arquivo recém-selecionado, na ordem:
 * EXIF da foto -> data de modificação do arquivo -> hoje. O usuário sempre
 * pode alterar antes de enviar (aí a origem vira MANUAL).
 */
export async function detectarDataCaptura(
  arquivo: File,
): Promise<DataCapturaDetectada> {
  const doExif = await extrairDataCapturaExif(arquivo);
  if (doExif) {
    return { data: doExif, origem: 'EXIF' };
  }

  if (arquivo.lastModified) {
    return {
      data: paraIsoLocal(new Date(arquivo.lastModified)),
      origem: 'ARQUIVO',
    };
  }

  return { data: paraIsoLocal(new Date()), origem: 'MANUAL' };
}
