// Paleta de cores e cor de texto compartilhadas por todos os gráficos
// ApexCharts do app (dashboard e formas de pagamento), para manter a mesma
// identidade visual em qualquer tela com gráfico.
//
// TEXTO_COR é aplicada explicitamente em foreColor/legend/xaxis/yaxis/
// dataLabels de cada gráfico — os defaults do ApexCharts escolhem texto de
// baixo contraste contra o fundo branco dos cards, então nunca depender do
// default da biblioteca para cor de texto.
export const TEXTO_COR = '#1f2733';

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
