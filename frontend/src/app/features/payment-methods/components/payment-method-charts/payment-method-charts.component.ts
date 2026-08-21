import { CommonModule } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
// Mesma razão do expense-charts.component.ts: garante que 'apexcharts' já
// esteja resolvido antes do primeiro import() dinâmico do ng-apexcharts,
// evitando a corrida "Element not found" ao montar o gráfico.
import 'apexcharts';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexDataLabels,
  ApexLegend,
  ApexNoData,
  ApexNonAxisChartSeries,
  ApexPlotOptions,
  ApexTooltip,
  ApexXAxis,
  ApexYAxis,
  NgApexchartsModule,
} from 'ng-apexcharts';
import { ExpenseStoreService } from '../../../../core/state/expense-store.service';
import { ResumoFormasPagamento } from '../../../../shared/utils/forma-pagamento.util';
import { PALETA_CORES, TEXTO_COR } from '../../../../shared/utils/chart-theme.util';

// Mesmas cores usadas nos gráficos do dashboard (índices 2/0/1 da paleta
// compartilhada = verde/índigo/laranja), na ordem Pix / Crédito 1x / Crédito
// parcelado, para manter a mesma identidade visual entre as duas telas.
// Cinza neutro para "Não identificado" — fora da paleta categórica porque
// representa ausência de classificação, não uma categoria em si.
const CORES_FORMAS_PAGAMENTO = [
  PALETA_CORES[2],
  PALETA_CORES[0],
  PALETA_CORES[1],
  '#9e9e9e',
];

@Component({
  selector: 'app-payment-method-charts',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatProgressSpinnerModule,
    NgApexchartsModule,
  ],
  templateUrl: './payment-method-charts.component.html',
  styleUrl: './payment-method-charts.component.scss',
})
export class PaymentMethodChartsComponent {
  readonly store = inject(ExpenseStoreService);
  readonly resumo = input.required<ResumoFormasPagamento>();

  readonly cores = CORES_FORMAS_PAGAMENTO;

  readonly rotulos = ['Pix', 'Crédito 1x', 'Crédito parcelado', 'Não identificado'];

  readonly valorSeries = computed<ApexNonAxisChartSeries>(() => {
    const r = this.resumo();
    return [r.pix.valor, r.creditoAvista.valor, r.creditoParcelado.valor, r.naoIdentificado.valor].map(
      (v) => Number(v.toFixed(2)),
    );
  });

  readonly quantidadeSeries = computed<ApexAxisChartSeries>(() => {
    const r = this.resumo();
    return [
      {
        name: 'Quantidade',
        data: [
          r.pix.quantidade,
          r.creditoAvista.quantidade,
          r.creditoParcelado.quantidade,
          r.naoIdentificado.quantidade,
        ],
      },
    ];
  });

  readonly xaxisFormas: ApexXAxis = {
    categories: this.rotulos,
    labels: { style: { colors: TEXTO_COR } },
  };

  readonly parcelamentoSeries = computed<ApexAxisChartSeries>(() => [
    {
      name: 'Despesas',
      data: this.resumo().distribuicaoParcelas.map((p) => p.quantidade),
    },
  ]);

  readonly xaxisParcelamento = computed<ApexXAxis>(() => ({
    categories: this.resumo().distribuicaoParcelas.map((p) => `${p.parcelas}x`),
    labels: { style: { colors: TEXTO_COR } },
  }));

  readonly yaxisComTexto: ApexYAxis = {
    labels: { style: { colors: TEXTO_COR } },
  };

  readonly donutChart: ApexChart = { type: 'donut', height: 300, foreColor: TEXTO_COR };
  readonly barChart: ApexChart = {
    type: 'bar',
    height: 300,
    toolbar: { show: false },
    foreColor: TEXTO_COR,
  };

  readonly plotOptionsBar: ApexPlotOptions = {
    bar: { borderRadius: 4, columnWidth: '55%' },
  };

  readonly dataLabelsOff: ApexDataLabels = { enabled: false };

  readonly legendBottom: ApexLegend = {
    position: 'bottom',
    labels: { colors: TEXTO_COR },
  };
  readonly legendHidden: ApexLegend = { show: false };

  readonly tooltipMoeda: ApexTooltip = {
    theme: 'light',
    y: { formatter: (val: number) => this.formatarMoeda(val) },
  };

  readonly tooltipQuantidade: ApexTooltip = { theme: 'light' };

  readonly noData: ApexNoData = {
    text: 'Nenhuma despesa encontrada para os filtros aplicados.',
    style: { color: 'rgba(31, 39, 51, 0.55)' },
  };

  private formatarMoeda(valor: number): string {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
}
