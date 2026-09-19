import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ExpenseStoreService } from '../../core/state/expense-store.service';
import { Expense, ExpenseFilters } from '../../core/models/expense.model';
import { ExpenseFiltersComponent } from './components/expense-filters/expense-filters.component';
import { ExpenseTableComponent } from './components/expense-table/expense-table.component';
import {
  ExpenseFormDialogComponent,
  ExpenseFormDialogData,
} from './components/expense-form-dialog/expense-form-dialog.component';
import { exportarCsv } from '../../shared/utils/csv-export.util';
import {
  formaPagamentoLabel,
  parcelasLabel,
} from '../../shared/utils/forma-pagamento.util';

const FILTROS_VAZIOS: ExpenseFilters = {
  dataInicio: null,
  dataFim: null,
  categoria: null,
  descricao: '',
};

@Component({
  selector: 'app-expenses-list',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    ExpenseFiltersComponent,
    ExpenseTableComponent,
  ],
  templateUrl: './expenses-list.component.html',
  styleUrl: './expenses-list.component.scss',
})
export class ExpensesListComponent {
  readonly store = inject(ExpenseStoreService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  private readonly tabela = viewChild(ExpenseTableComponent);

  private readonly filtros = signal<ExpenseFilters>({ ...FILTROS_VAZIOS });

  readonly temFiltrosAtivos = computed(() => {
    const f = this.filtros();
    return Boolean(f.dataInicio || f.dataFim || f.categoria || f.descricao);
  });

  readonly despesasFiltradas = computed(() => {
    const f = this.filtros();
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
      return true;
    });
  });

  // Sempre a soma do conjunto atualmente filtrado (ou de todas as despesas,
  // quando não há filtro ativo) — nunca um total fixo calculado à parte.
  readonly totalFiltrado = computed(() =>
    this.despesasFiltradas().reduce((soma, despesa) => soma + despesa.valor, 0),
  );

  aplicarFiltros(filtros: ExpenseFilters): void {
    this.filtros.set(filtros);
    this.tabela()?.irParaPrimeiraPagina();
  }

  limparFiltros(): void {
    this.filtros.set({ ...FILTROS_VAZIOS });
    this.tabela()?.irParaPrimeiraPagina();
  }

  exportarDespesasCsv(): void {
    const despesas = this.despesasFiltradas();
    if (despesas.length === 0) {
      this.snackBar.open(
        'Não há despesas para exportar com os filtros atuais.',
        'Fechar',
        { duration: 4000 },
      );
      return;
    }

    const labels = this.store.categoriaLabels();
    const hoje = new Date();
    const dataArquivo = [
      hoje.getFullYear(),
      String(hoje.getMonth() + 1).padStart(2, '0'),
      String(hoje.getDate()).padStart(2, '0'),
    ].join('-');

    exportarCsv<Expense>(
      `despesas-reforma-${dataArquivo}.csv`,
      [
        {
          cabecalho: 'Data',
          valor: (despesa) => {
            const [ano, mes, dia] = despesa.data.slice(0, 10).split('-');
            return `${dia}/${mes}/${ano}`;
          },
        },
        { cabecalho: 'Descrição', valor: (despesa) => despesa.descricao },
        {
          cabecalho: 'Categoria',
          valor: (despesa) => labels.get(despesa.categoria) ?? despesa.categoria,
        },
        {
          cabecalho: 'Valor',
          valor: (despesa) => despesa.valor.toFixed(2).replace('.', ','),
        },
        { cabecalho: 'Forma de pagamento', valor: (despesa) => formaPagamentoLabel(despesa) },
        {
          cabecalho: 'Parcelas',
          valor: (despesa) => {
            const label = parcelasLabel(despesa);
            return label === '—' ? '' : label.replace('x', '');
          },
        },
        { cabecalho: 'Observação', valor: (despesa) => despesa.observacao ?? '' },
      ],
      despesas,
    );
  }

  novaDespesa(): void {
    const ref = this.dialog.open<
      ExpenseFormDialogComponent,
      ExpenseFormDialogData
    >(ExpenseFormDialogComponent, {
      data: { categorias: this.store.categorias(), expense: null },
    });

    ref.afterClosed().subscribe((payload) => {
      if (!payload) return;
      this.store.criar(payload).subscribe({
        next: (despesaCriada) => {
          this.snackBar.open('Despesa cadastrada com sucesso.', 'Fechar', {
            duration: 3000,
          });
          this.store.adicionarDespesaLocal(despesaCriada);
        },
        error: () =>
          this.snackBar.open(
            'Não foi possível cadastrar a despesa.',
            'Fechar',
            { duration: 4000 },
          ),
      });
    });
  }
}
