import { Component, inject } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { CategoriaOption, Expense, ExpensePayload } from '../../../../core/models/expense.model';
import { MoedaInputDirective } from '../../../../shared/directives/moeda-input.directive';

export interface ExpenseFormDialogData {
  categorias: CategoriaOption[];
  expense: Expense | null;
}

@Component({
  selector: 'app-expense-form-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatButtonModule,
    MoedaInputDirective,
  ],
  templateUrl: './expense-form-dialog.component.html',
  styleUrl: './expense-form-dialog.component.scss',
})
export class ExpenseFormDialogComponent {
  private readonly fb = inject(FormBuilder);
  readonly dialogRef = inject(
    MatDialogRef<ExpenseFormDialogComponent, ExpensePayload>,
  );
  readonly data = inject<ExpenseFormDialogData>(MAT_DIALOG_DATA);

  readonly editando = Boolean(this.data.expense);

  readonly form = this.fb.nonNullable.group({
    valor: [
      this.data.expense?.valor ?? null,
      [Validators.required, Validators.min(0.01)],
    ],
    descricao: [
      this.data.expense?.descricao ?? '',
      [Validators.required, Validators.maxLength(200)],
    ],
    categoria: [
      this.data.expense?.categoria ?? null,
      [Validators.required],
    ],
    data: [
      this.data.expense
        ? new Date(`${this.data.expense.data.slice(0, 10)}T00:00:00`)
        : new Date(),
      [Validators.required],
    ],
    observacao: [this.data.expense?.observacao ?? ''],
  });

  salvar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const valores = this.form.getRawValue();
    const data = valores.data;
    const dataIso = [
      data.getFullYear(),
      String(data.getMonth() + 1).padStart(2, '0'),
      String(data.getDate()).padStart(2, '0'),
    ].join('-');

    const payload: ExpensePayload = {
      valor: Number(valores.valor),
      descricao: valores.descricao.trim(),
      categoria: valores.categoria as ExpensePayload['categoria'],
      data: dataIso,
      observacao: valores.observacao?.trim() || undefined,
    };

    this.dialogRef.close(payload);
  }

  cancelar(): void {
    this.dialogRef.close(undefined);
  }
}
