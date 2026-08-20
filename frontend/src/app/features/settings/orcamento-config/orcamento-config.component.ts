import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ExpenseStoreService } from '../../../core/state/expense-store.service';
import { MoedaInputDirective } from '../../../shared/directives/moeda-input.directive';
import { OrcamentoEspecificoPanelComponent } from './components/orcamento-especifico-panel/orcamento-especifico-panel.component';

@Component({
  selector: 'app-orcamento-config',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MoedaInputDirective,
    OrcamentoEspecificoPanelComponent,
  ],
  templateUrl: './orcamento-config.component.html',
  styleUrl: './orcamento-config.component.scss',
})
export class OrcamentoConfigComponent {
  readonly store = inject(ExpenseStoreService);
  private readonly fb = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);

  readonly salvando = signal(false);

  readonly progresso = computed(() =>
    Math.min(this.store.percentualConsumido(), 100),
  );
  readonly valorExcedente = computed(() => Math.abs(this.store.saldo()));

  readonly form = this.fb.nonNullable.group({
    valor: [null as number | null, [Validators.required, Validators.min(0)]],
  });

  private orcamentoJaPreenchido = false;

  constructor() {
    effect(() => {
      if (this.store.pronto() && !this.orcamentoJaPreenchido) {
        this.orcamentoJaPreenchido = true;
        this.form.patchValue({ valor: this.store.orcamento() || null });
      }
    });
  }

  salvar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const valor = Number(this.form.getRawValue().valor);
    this.salvando.set(true);
    this.store
      .atualizarOrcamento('GERAL', valor)
      .pipe(finalize(() => this.salvando.set(false)))
      .subscribe({
        next: () => {
          this.store.definirOrcamentoLocal('GERAL', valor);
          this.snackBar.open('Orçamento atualizado com sucesso.', 'Fechar', {
            duration: 3000,
          });
        },
        error: () =>
          this.snackBar.open(
            'Não foi possível atualizar o orçamento.',
            'Fechar',
            { duration: 4000 },
          ),
      });
  }
}
