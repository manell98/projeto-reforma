import { Component, inject, signal } from '@angular/core';
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
import {
  CategoriaOption,
  Expense,
  ExpensePayload,
  FormaPagamento,
} from '../../../../core/models/expense.model';
import { MoedaInputDirective } from '../../../../shared/directives/moeda-input.directive';

export interface ExpenseFormDialogData {
  categorias: CategoriaOption[];
  expense: Expense | null;
}

export const PARCELAS_OPCOES = Array.from({ length: 12 }, (_, i) => i + 1);

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
  readonly parcelasOpcoes = PARCELAS_OPCOES;

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
    formaPagamento: [
      this.data.expense?.formaPagamento ?? null,
      [Validators.required],
    ],
    parcelas: [this.data.expense?.parcelas ?? null],
  });

  // Espelha o controle `formaPagamento` num signal só para controlar a
  // exibição do campo "Parcelas" no template (o form em si continua sendo a
  // fonte de verdade validada/enviada no submit).
  readonly formaPagamentoSelecionada = signal<FormaPagamento | null>(
    this.form.controls.formaPagamento.value,
  );

  constructor() {
    this.atualizarValidacaoParcelas(this.form.controls.formaPagamento.value);
    this.form.controls.formaPagamento.valueChanges.subscribe((valor) => {
      this.formaPagamentoSelecionada.set(valor);
      this.atualizarValidacaoParcelas(valor);
    });
  }

  // Cartão de crédito exige parcelas (1x a 12x); Pix nunca as usa — trocar
  // para Pix limpa e desabilita o campo, evitando enviar uma combinação
  // inconsistente.
  private atualizarValidacaoParcelas(forma: FormaPagamento | null): void {
    const parcelasControl = this.form.controls.parcelas;
    if (forma === 'CARTAO_CREDITO') {
      parcelasControl.enable({ emitEvent: false });
      parcelasControl.setValidators([Validators.required]);
    } else {
      parcelasControl.reset(null, { emitEvent: false });
      parcelasControl.disable({ emitEvent: false });
      parcelasControl.clearValidators();
    }
    parcelasControl.updateValueAndValidity({ emitEvent: false });
  }

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
      formaPagamento: valores.formaPagamento as FormaPagamento,
      parcelas:
        valores.formaPagamento === 'CARTAO_CREDITO' ? valores.parcelas : null,
    };

    this.dialogRef.close(payload);
  }

  cancelar(): void {
    this.dialogRef.close(undefined);
  }
}
