import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
// ng-apexcharts carrega 'apexcharts' via import() dinâmico internamente ao
// montar o primeiro gráfico; importá-lo aqui estaticamente garante que o
// módulo já esteja resolvido nesse momento, evitando uma corrida entre esse
// import assíncrono e a criação/desmontagem do elemento do gráfico.
import 'apexcharts';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexDataLabels,
  ApexFill,
  ApexLegend,
  ApexNoData,
  ApexNonAxisChartSeries,
  ApexPlotOptions,
  ApexStroke,
  ApexTooltip,
  ApexXAxis,
  ApexYAxis,
  NgApexchartsModule,
} from 'ng-apexcharts';
import { ExpenseStoreService } from '../../../../core/state/expense-store.service';

const PALETA_CORES = [
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

// Cor de texto explícita para todos os elementos dos gráficos (eixos,
// legendas, data labels, tooltip). Sem isso, o ApexCharts às vezes escolhe um
// texto claro/pouco contrastante contra o fundo branco dos cards — problema
// real reportado pelo usuário. Fixar `foreColor` no `chart` e repetir a cor
// em `legend`/`xaxis`/`yaxis`/`dataLabels` garante contraste consistente.
const TEXTO_COR = '#1f2733';

@Component({
  selector: 'app-expense-charts',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    NgApexchartsModule,
  ],
  templateUrl: './expense-charts.component.html',
  styleUrl: './expense-charts.component.scss',
})
export class ExpenseChartsComponent {
  readonly store = inject(ExpenseStoreService);

  readonly cores = PALETA_CORES;

  readonly distribuicaoSeries = computed<ApexNonAxisChartSeries>(() =>
    this.store.porCategoria().map((c) => Number(c.total.toFixed(2))),
  );
  readonly distribuicaoLabels = computed(() =>
    this.store.porCategoria().map((c) => c.label),
  );

  readonly rankingSeries = computed<ApexAxisChartSeries>(() =>
    this.store.porCategoria().length === 0
      ? []
      : [
          {
            name: 'Total gasto',
            data: this.store
              .porCategoria()
              .map((c) => Number(c.total.toFixed(2))),
          },
        ],
  );
  readonly rankingCategorias = computed(() =>
    this.store.porCategoria().map((c) => c.label),
  );
  readonly xaxisRanking = computed<ApexXAxis>(() => ({
    categories: this.rankingCategorias(),
    labels: { style: { colors: TEXTO_COR } },
  }));

  readonly evolucaoSeries = computed<ApexAxisChartSeries>(() =>
    this.store.evolucaoMensal().length === 0
      ? []
      : [
          {
            name: 'Gastos',
            data: this.store
              .evolucaoMensal()
              .map((m) => Number(m.total.toFixed(2))),
          },
        ],
  );
  readonly evolucaoMeses = computed(() =>
    this.store.evolucaoMensal().map((m) => this.formatarMes(m.mes)),
  );
  readonly xaxisEvolucao = computed<ApexXAxis>(() => ({
    categories: this.evolucaoMeses(),
    labels: { style: { colors: TEXTO_COR } },
  }));

  readonly yaxisComTexto: ApexYAxis = {
    labels: { style: { colors: TEXTO_COR } },
  };

  readonly donutChart: ApexChart = {
    type: 'donut',
    height: 300,
    foreColor: TEXTO_COR,
  };
  readonly barChart: ApexChart = {
    type: 'bar',
    height: 320,
    toolbar: { show: false },
    foreColor: TEXTO_COR,
  };
  readonly lineChart: ApexChart = {
    type: 'area',
    height: 300,
    toolbar: { show: false },
    foreColor: TEXTO_COR,
  };

  readonly plotOptionsBarHorizontal: ApexPlotOptions = {
    bar: { horizontal: true, borderRadius: 4, dataLabels: { position: 'top' } },
  };

  readonly dataLabelsBar: ApexDataLabels = {
    enabled: true,
    formatter: (val: number) => this.formatarMoeda(val),
    offsetX: 24,
    style: { colors: [TEXTO_COR] },
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

  readonly strokeLine: ApexStroke = { curve: 'smooth', width: 2 };

  readonly fillGradient: ApexFill = {
    type: 'gradient',
    gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05 },
  };

  readonly noData: ApexNoData = {
    text: 'Sem despesas cadastradas ainda.',
    style: { color: 'rgba(31, 39, 51, 0.55)' },
  };

  private formatarMoeda(valor: number): string {
    return valor.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  }

  private formatarMes(mes: string): string {
    const [ano, mesNumero] = mes.split('-');
    const data = new Date(Number(ano), Number(mesNumero) - 1, 1);
    return data
      .toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
      .replace('.', '');
  }
}
