import { MatPaginatorIntl } from '@angular/material/paginator';

// O MatPaginatorIntl padrão do Angular Material vem em inglês mesmo com
// LOCALE_ID/MAT_DATE_LOCALE em 'pt-BR' — essas duas não afetam os textos do
// paginator, que exige seu próprio provider. Sem isso, "Items per page" e
// as setas de navegação destoavam do restante do app, que é 100% em
// português (ver app.config.ts: `provideMatPaginatorIntlPtBr()`).
export function criarMatPaginatorIntlPtBr(): MatPaginatorIntl {
  const intl = new MatPaginatorIntl();

  intl.itemsPerPageLabel = 'Itens por página:';
  intl.nextPageLabel = 'Próxima página';
  intl.previousPageLabel = 'Página anterior';
  intl.firstPageLabel = 'Primeira página';
  intl.lastPageLabel = 'Última página';

  intl.getRangeLabel = (pagina: number, tamanhoPagina: number, total: number): string => {
    if (total === 0 || tamanhoPagina === 0) {
      return `0 de ${total}`;
    }
    const totalReal = Math.max(total, 0);
    const inicio = pagina * tamanhoPagina;
    const fim =
      inicio < totalReal
        ? Math.min(inicio + tamanhoPagina, totalReal)
        : inicio + tamanhoPagina;
    return `${inicio + 1} – ${fim} de ${totalReal}`;
  };

  return intl;
}
