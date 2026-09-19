export interface ColunaCsv<T> {
  cabecalho: string;
  valor: (item: T) => string;
}

/**
 * Escapa um campo conforme RFC 4180: envolve em aspas duplas qualquer valor
 * que contenha vírgula, aspas ou quebra de linha, dobrando aspas internas.
 */
function escaparCampoCsv(campo: string): string {
  if (/[",\r\n]/.test(campo)) {
    return `"${campo.replace(/"/g, '""')}"`;
  }
  return campo;
}

function linhaCsv(campos: string[]): string {
  return campos.map(escaparCampoCsv).join(',');
}

/**
 * Gera um CSV com BOM UTF-8 (para abrir corretamente no Excel, com
 * acentuação preservada) a partir de uma lista de itens e dispara o
 * download no navegador. Genérica o bastante para reaproveitar em outras
 * telas além de despesas.
 */
export function exportarCsv<T>(
  nomeArquivo: string,
  colunas: ColunaCsv<T>[],
  itens: T[],
): void {
  const linhas = [
    linhaCsv(colunas.map((coluna) => coluna.cabecalho)),
    ...itens.map((item) => linhaCsv(colunas.map((coluna) => coluna.valor(item)))),
  ];
  const conteudo = '﻿' + linhas.join('\r\n');

  const blob = new Blob([conteudo], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nomeArquivo;
  link.click();
  URL.revokeObjectURL(url);
}
