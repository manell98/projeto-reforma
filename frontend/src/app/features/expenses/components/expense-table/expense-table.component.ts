import {
  AfterViewInit,
  Component,
  effect,
  inject,
  input,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ExpenseStoreService } from '../../../../core/state/expense-store.service';
import { Expense } from '../../../../core/models/expense.model';
import {
  ConfirmDialogComponent,
} from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import {
  ExpenseFormDialogComponent,
  ExpenseFormDialogData,
} from '../expense-form-dialog/expense-form-dialog.component';
import {
  formaPagamentoLabel,
  parcelasLabel,
} from '../../../../shared/utils/forma-pagamento.util';

@Component({
  selector: 'app-expense-table',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './expense-table.component.html',
  styleUrl: './expense-table.component.scss',
})
export class ExpenseTableComponent implements AfterViewInit {
  readonly store = inject(ExpenseStoreService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  readonly despesas = input.required<Expense[]>();
  readonly filtrosAtivos = input(false);

  readonly colunas = [
    'data',
    'descricao',
    'categoria',
    'formaPagamento',
    'parcelas',
    'valor',
    'acoes',
  ];

  readonly formaPagamentoLabel = formaPagamentoLabel;
  readonly parcelasLabel = parcelasLabel;

  readonly dataSource = new MatTableDataSource<Expense>([]);

  @ViewChild(MatSort) private sort?: MatSort;
  @ViewChild(MatPaginator) private paginator?: MatPaginator;

  constructor() {
    // `sortingDataAccessor` centraliza a comparação por coluna: strings ISO
    // (data) ordenam bem lexicograficamente, e os campos nulos (parcelas)
    // precisam de um valor sentinela — aqui, "sem informação" sempre fica no
    // início em ordem crescente (tratado como menor que qualquer valor real).
    this.dataSource.sortingDataAccessor = (despesa, coluna) => {
      switch (coluna) {
        case 'data':
          return despesa.data;
        case 'descricao':
          return despesa.descricao.toLowerCase();
        case 'categoria':
          return this.store.categoriaLabels().get(despesa.categoria) ?? despesa.categoria;
        case 'formaPagamento':
          return formaPagamentoLabel(despesa);
        case 'parcelas':
          return despesa.parcelas ?? -1;
        case 'valor':
          return despesa.valor;
        default:
          return '';
      }
    };

    // O `input()` de despesas muda a cada filtro/ordenação de origem — este
    // effect mantém o data source (e portanto sort/paginator) sincronizado
    // sem recriar a instância, o que preservaria a página/ordenação atuais.
    effect(() => {
      this.dataSource.data = this.despesas();
    });
  }

  ngAfterViewInit(): void {
    if (this.sort) this.dataSource.sort = this.sort;
    if (this.paginator) this.dataSource.paginator = this.paginator;
  }

  // Chamado pela tela de despesas quando os filtros mudam, pra não deixar o
  // usuário "preso" numa página que ficou vazia após filtrar.
  irParaPrimeiraPagina(): void {
    this.paginator?.firstPage();
  }

  // Mesmos ícones já usados na tela de formas de pagamento.
  iconeFormaPagamento(despesa: Expense): string {
    if (despesa.formaPagamento === 'PIX') return 'qr_code_2';
    if (despesa.formaPagamento === 'CARTAO_CREDITO') return 'credit_card';
    return 'help_outline';
  }

  editar(expense: Expense): void {
    const ref = this.dialog.open<
      ExpenseFormDialogComponent,
      ExpenseFormDialogData
    >(ExpenseFormDialogComponent, {
      data: { categorias: this.store.categorias(), expense },
    });

    ref.afterClosed().subscribe((payload) => {
      if (!payload) return;
      this.store.atualizar(expense.id, payload).subscribe({
        next: (despesaAtualizada) => {
          this.snackBar.open('Despesa atualizada com sucesso.', 'Fechar', {
            duration: 3000,
          });
          this.store.atualizarDespesaLocal(despesaAtualizada);
        },
        error: () =>
          this.snackBar.open(
            'Não foi possível atualizar a despesa.',
            'Fechar',
            { duration: 4000 },
          ),
      });
    });
  }

  excluir(expense: Expense): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        titulo: 'Excluir despesa',
        mensagem: `Tem certeza que deseja excluir "${expense.descricao}"? Essa ação não pode ser desfeita.`,
        textoConfirmar: 'Excluir',
      },
    });

    ref.afterClosed().subscribe((confirmado) => {
      if (!confirmado) return;
      this.store.remover(expense.id).subscribe({
        next: () => {
          this.snackBar.open('Despesa excluída.', 'Fechar', {
            duration: 3000,
          });
          this.store.removerDespesaLocal(expense.id);
        },
        error: () =>
          this.snackBar.open(
            'Não foi possível excluir a despesa.',
            'Fechar',
            { duration: 4000 },
          ),
      });
    });
  }
}
