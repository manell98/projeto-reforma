import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { ResumoFormasPagamento } from '../../../../shared/utils/forma-pagamento.util';

@Component({
  selector: 'app-payment-method-cards',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule],
  templateUrl: './payment-method-cards.component.html',
  styleUrl: './payment-method-cards.component.scss',
})
export class PaymentMethodCardsComponent {
  readonly resumo = input.required<ResumoFormasPagamento>();
}
