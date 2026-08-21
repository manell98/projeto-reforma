import { CommonModule } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ParcelaResumo } from '../../../../shared/utils/forma-pagamento.util';

@Component({
  selector: 'app-installment-distribution',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatProgressBarModule],
  templateUrl: './installment-distribution.component.html',
  styleUrl: './installment-distribution.component.scss',
})
export class InstallmentDistributionComponent {
  readonly distribuicao = input.required<ParcelaResumo[]>();

  // Maior valor entre as faixas de parcelamento, usado só para desenhar a
  // barra proporcional de cada linha (relativa entre as próprias faixas,
  // não um percentual do orçamento) — puramente visual, não altera os
  // números exibidos.
  readonly maiorValor = computed(() =>
    Math.max(1, ...this.distribuicao().map((item) => item.valor)),
  );

  proporcao(valor: number): number {
    return (valor / this.maiorValor()) * 100;
  }
}
