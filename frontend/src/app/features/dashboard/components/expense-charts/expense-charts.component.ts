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
import { ThemeService } from '../../../../core/services/theme.service';
import {
  PALETA_CORES,
  corNoDataGrafico,
  corTextoGrafico,
  temaTooltipGrafico,
} from '../../../../shared/utils/chart-theme.util';

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
  private readonly tema = inject(ThemeService);

  readonly cores = PALETA_CORES;

  // Cor de texto/tooltip/"sem dados" recalculada quando o tema claro/escuro
  // muda — ver o comentário de chart-theme.util.ts sobre por que isso não
  // pode ser uma constante fixa.
  private readonly corTexto = computed(() => corTextoGrafico(this.tema.escuro()));
  private readonly temaTooltip = computed(() => temaTooltipGrafico(this.tema.escuro()));
  private readonly corNoData = computed(() => corNoDataGrafico(this.tema.escuro()));

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
    labels: { style: { colors: this.corTexto() } },
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
    labels: { style: { colors: this.corTexto() } },
  }));

  readonly yaxisComTexto = computed<ApexYAxis>(() => ({
    labels: { style: { colors: this.corTexto() } },
  }));

  // Eixo Y do card "Evolução dos gastos por mês" — mesmos valores do
  // yaxisComTexto, mas com formatter em reais (ex: "R$ 1.000,00") em vez do
  // número cru, seguindo o mesmo padrão de moeda já usado no tooltip.
  readonly yaxisEvolucaoComMoeda = computed<ApexYAxis>(() => ({
    labels: {
      style: { colors: this.corTexto() },
      formatter: (val: number) => this.formatarMoeda(val),
    },
  }));

  readonly donutChart = computed<ApexChart>(() => ({
    type: 'donut',
    height: 300,
    foreColor: this.corTexto(),
  }));
  readonly barChart = computed<ApexChart>(() => ({
    type: 'bar',
    height: 320,
    toolbar: { show: false },
    foreColor: this.corTexto(),
  }));
  readonly lineChart = computed<ApexChart>(() => ({
    type: 'area',
    height: 300,
    toolbar: { show: false },
    foreColor: this.corTexto(),
  }));

  readonly plotOptionsBarHorizontal: ApexPlotOptions = {
    bar: { horizontal: true, borderRadius: 4, dataLabels: { position: 'top' } },
  };

  readonly dataLabelsBar = computed<ApexDataLabels>(() => ({
    enabled: true,
    formatter: (val: number) => this.formatarMoeda(val),
    offsetX: 24,
    style: { colors: [this.corTexto()] },
  }));

  readonly dataLabelsOff: ApexDataLabels = { enabled: false };

  readonly legendBottom = computed<ApexLegend>(() => ({
    position: 'bottom',
    labels: { colors: this.corTexto() },
  }));
  readonly legendHidden: ApexLegend = { show: false };

  readonly tooltipMoeda = computed<ApexTooltip>(() => ({
    theme: this.temaTooltip(),
    y: { formatter: (val: number) => this.formatarMoeda(val) },
  }));

  readonly strokeLine: ApexStroke = { curve: 'smooth', width: 2 };

  readonly fillGradient: ApexFill = {
    type: 'gradient',
    gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05 },
  };

  readonly noData = computed<ApexNoData>(() => ({
    text: 'Sem despesas cadastradas ainda.',
    style: { color: this.corNoData() },
  }));

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
