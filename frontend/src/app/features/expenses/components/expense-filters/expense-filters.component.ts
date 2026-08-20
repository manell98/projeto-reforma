import { Component, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import {
  Categoria,
  CategoriaOption,
  ExpenseFilters,
} from '../../../../core/models/expense.model';

@Component({
  selector: 'app-expense-filters',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './expense-filters.component.html',
  styleUrl: './expense-filters.component.scss',
})
export class ExpenseFiltersComponent {
  readonly categorias = input.required<CategoriaOption[]>();
  readonly filtrosAtivos = input(false);

  readonly filtrar = output<ExpenseFilters>();
  readonly limpar = output<void>();

  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.nonNullable.group({
    dataInicio: null as Date | null,
    dataFim: null as Date | null,
    categoria: null as Categoria | null,
    descricao: '',
  });

  aplicar(): void {
    const valores = this.form.getRawValue();
    this.filtrar.emit({
      dataInicio: this.paraIso(valores.dataInicio),
      dataFim: this.paraIso(valores.dataFim),
      categoria: valores.categoria,
      descricao: valores.descricao.trim(),
    });
  }

  limparFiltros(): void {
    this.form.reset({
      dataInicio: null,
      dataFim: null,
      categoria: null,
      descricao: '',
    });
    this.limpar.emit();
  }

  private paraIso(data: Date | null): string | null {
    if (!data) return null;
    return [
      data.getFullYear(),
      String(data.getMonth() + 1).padStart(2, '0'),
      String(data.getDate()).padStart(2, '0'),
    ].join('-');
  }
}
