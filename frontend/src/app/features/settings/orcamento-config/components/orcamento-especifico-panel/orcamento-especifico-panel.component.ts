import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { finalize } from 'rxjs';
import { ExpenseStoreService } from '../../../../../core/state/expense-store.service';
import { TipoOrcamentoEspecifico } from '../../../../../core/models/orcamento.model';
import { MoedaInputDirective } from '../../../../../shared/directives/moeda-input.directive';

@Component({
  selector: 'app-orcamento-especifico-panel',
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
  ],
  templateUrl: './orcamento-especifico-panel.component.html',
  styleUrl: './orcamento-especifico-panel.component.scss',
})
export class OrcamentoEspecificoPanelComponent {
  readonly tipo = input.required<TipoOrcamentoEspecifico>();
  // No dashboard o painel é só leitura; em Configurações permite editar.
  readonly editavel = input(true);

  readonly store = inject(ExpenseStoreService);
  private readonly fb = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);

  // O título vem sempre do mesmo mapa de labels que a API expõe em
  // /expenses/categorias — nunca digitado à mão aqui, pra não haver o menor
  // risco de uma tela mostrar "Tio Neguim" e outra "Tio Neguinho".
  readonly titulo = computed(
    () => this.store.categoriaLabels().get(this.tipo()) ?? this.tipo(),
  );

  readonly salvandoOrcamento = signal(false);

  readonly orcamento = computed(() => this.store.orcamentoEspecifico(this.tipo()));
  readonly totalGasto = computed(() => this.store.totalGastoEspecifico(this.tipo()));
  readonly saldo = computed(() => this.store.saldoEspecifico(this.tipo()));
  readonly percentualConsumido = computed(() =>
    this.store.percentualEspecificoConsumido(this.tipo()),
  );
  readonly orcamentoConfigurado = computed(() =>
    this.store.orcamentoEspecificoConfigurado(this.tipo()),
  );
  readonly excedido = computed(() => this.store.excedidoEspecifico(this.tipo()));
  readonly progresso = computed(() =>
    Math.min(this.percentualConsumido(), 100),
  );
  readonly valorExcedente = computed(() => Math.abs(this.saldo()));

  readonly formOrcamento = this.fb.nonNullable.group({
    valor: [null as number | null, [Validators.required, Validators.min(0)]],
  });

  private orcamentoJaPreenchido = false;

  constructor() {
    // O valor inicial do orçamento chega de forma assíncrona (carregarInicial
    // roda via HTTP); assim que os dados carregarem pela primeira vez,
    // preenche o campo — só uma vez, para não sobrescrever o que o usuário
    // já estiver digitando em edições futuras.
    effect(() => {
      if (this.store.pronto() && !this.orcamentoJaPreenchido) {
        this.orcamentoJaPreenchido = true;
        this.formOrcamento.patchValue({ valor: this.orcamento() || null });
      }
    });
  }

  salvarOrcamento(): void {
    if (this.formOrcamento.invalid) {
      this.formOrcamento.markAllAsTouched();
      return;
    }
    const valor = Number(this.formOrcamento.getRawValue().valor);
    this.salvandoOrcamento.set(true);
    this.store
      .atualizarOrcamento(this.tipo(), valor)
      .pipe(finalize(() => this.salvandoOrcamento.set(false)))
      .subscribe({
        next: () => {
          this.store.definirOrcamentoLocal(this.tipo(), valor);
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
