import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { ExpenseStoreService } from '../../core/state/expense-store.service';
import { ExpenseFilters } from '../../core/models/expense.model';
import { ExpenseFiltersComponent } from '../expenses/components/expense-filters/expense-filters.component';
import {
  GRUPO_FORMA_PAGAMENTO_LABELS,
  GrupoFormaPagamento,
  grupoFormaPagamento,
  resumirFormasPagamento,
} from '../../shared/utils/forma-pagamento.util';
import { PaymentMethodCardsComponent } from './components/payment-method-cards/payment-method-cards.component';
import { PaymentMethodChartsComponent } from './components/payment-method-charts/payment-method-charts.component';
import { InstallmentDistributionComponent } from './components/installment-distribution/installment-distribution.component';

const FILTROS_VAZIOS: ExpenseFilters = {
  dataInicio: null,
  dataFim: null,
  categoria: null,
  descricao: '',
};

@Component({
  selector: 'app-payment-methods',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatSelectModule,
    ExpenseFiltersComponent,
    PaymentMethodCardsComponent,
    PaymentMethodChartsComponent,
    InstallmentDistributionComponent,
  ],
  templateUrl: './payment-methods.component.html',
  styleUrl: './payment-methods.component.scss',
})
export class PaymentMethodsComponent {
  readonly store = inject(ExpenseStoreService);

  readonly formaPagamentoOptions = Object.entries(GRUPO_FORMA_PAGAMENTO_LABELS).map(
    ([valor, label]) => ({ valor: valor as GrupoFormaPagamento, label }),
  );

  private readonly filtrosBase = signal<ExpenseFilters>({ ...FILTROS_VAZIOS });
  readonly formaPagamentoFiltro = signal<GrupoFormaPagamento | null>(null);
  readonly parcelasFiltro = signal<number | null>(null);

  readonly parcelasDisponiveis = computed(() => {
    const encontradas = new Set<number>();
    for (const despesa of this.store.expenses()) {
      if (despesa.formaPagamento === 'CARTAO_CREDITO' && despesa.parcelas !== null) {
        encontradas.add(despesa.parcelas);
      }
    }
    return Array.from(encontradas).sort((a, b) => a - b);
  });

  readonly temFiltrosAtivos = computed(() => {
    const f = this.filtrosBase();
    return Boolean(
      f.dataInicio ||
        f.dataFim ||
        f.categoria ||
        f.descricao ||
        this.formaPagamentoFiltro() ||
        this.parcelasFiltro() !== null,
    );
  });

  readonly despesasFiltradas = computed(() => {
    const f = this.filtrosBase();
    const grupo = this.formaPagamentoFiltro();
    const parcelas = this.parcelasFiltro();

    return this.store.expenses().filter((despesa) => {
      if (f.categoria && despesa.categoria !== f.categoria) return false;
      if (
        f.descricao &&
        !despesa.descricao.toLowerCase().includes(f.descricao.toLowerCase())
      ) {
        return false;
      }
      const dataDespesa = despesa.data.slice(0, 10);
      if (f.dataInicio && dataDespesa < f.dataInicio) return false;
      if (f.dataFim && dataDespesa > f.dataFim) return false;
      if (grupo && grupoFormaPagamento(despesa) !== grupo) return false;
      if (parcelas !== null && despesa.parcelas !== parcelas) return false;
      return true;
    });
  });

  readonly resumo = computed(() => resumirFormasPagamento(this.despesasFiltradas()));

  aplicarFiltrosBase(filtros: ExpenseFilters): void {
    this.filtrosBase.set(filtros);
  }

  limparFiltrosBase(): void {
    this.filtrosBase.set({ ...FILTROS_VAZIOS });
    this.formaPagamentoFiltro.set(null);
    this.parcelasFiltro.set(null);
  }

  definirFormaPagamentoFiltro(valor: GrupoFormaPagamento | null): void {
    this.formaPagamentoFiltro.set(valor);
  }

  definirParcelasFiltro(valor: number | null): void {
    this.parcelasFiltro.set(valor);
  }
}
