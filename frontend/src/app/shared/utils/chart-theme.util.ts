// Paleta de cores e cor de texto compartilhadas por todos os gráficos
// ApexCharts do app (dashboard e formas de pagamento), para manter a mesma
// identidade visual em qualquer tela com gráfico.
//
// A cor de texto é aplicada explicitamente em foreColor/legend/xaxis/yaxis/
// dataLabels de cada gráfico — os defaults do ApexCharts escolhem texto de
// baixo contraste contra o fundo do card, então nunca depender do default da
// biblioteca. Como o app agora tem tema claro/escuro, essa cor (e o tema do
// tooltip/texto de "sem dados") precisam reagir ao tema ativo — por isso são
// funções de `escuro: boolean` em vez de constantes fixas; quem consome isso
// deve envolver o resultado num `computed()` a partir de `ThemeService.escuro`
// para manter a mesma referência estável entre re-renders não relacionados.
export function corTextoGrafico(escuro: boolean): string {
  return escuro ? '#e8ecf3' : '#1f2733';
}

export function corNoDataGrafico(escuro: boolean): string {
  return escuro ? 'rgba(232, 236, 243, 0.55)' : 'rgba(31, 39, 51, 0.55)';
}

export function temaTooltipGrafico(escuro: boolean): 'light' | 'dark' {
  return escuro ? 'dark' : 'light';
}

export const PALETA_CORES: string[] = [
  '#3f51b5',
  '#ff9800',
  '#4caf50',
  '#e91e63',
  '#00bcd4',
  '#9c27b0',
  '#795548',
  '#ffc107',
  '#607d8b',
  '#f44336',
  '#009688',
];
