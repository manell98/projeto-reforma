import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ExpenseStoreService } from '../../core/state/expense-store.service';
import { ExpenseFilters } from '../../core/models/expense.model';
import { ExpenseFiltersComponent } from './components/expense-filters/expense-filters.component';
import { ExpenseTableComponent } from './components/expense-table/expense-table.component';
import {
  ExpenseFormDialogComponent,
  ExpenseFormDialogData,
} from './components/expense-form-dialog/expense-form-dialog.component';

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
  }

  limparFiltros(): void {
    this.filtros.set({ ...FILTROS_VAZIOS });
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
        next: () => {
          this.snackBar.open('Despesa cadastrada com sucesso.', 'Fechar', {
            duration: 3000,
          });
          this.store.carregarDespesas();
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
