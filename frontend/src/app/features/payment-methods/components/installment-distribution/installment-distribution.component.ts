import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { ParcelaResumo } from '../../../../shared/utils/forma-pagamento.util';

@Component({
  selector: 'app-installment-distribution',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule],
  templateUrl: './installment-distribution.component.html',
  styleUrl: './installment-distribution.component.scss',
})
export class InstallmentDistributionComponent {
  readonly distribuicao = input.required<ParcelaResumo[]>();
}
