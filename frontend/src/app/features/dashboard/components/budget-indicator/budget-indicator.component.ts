import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RouterLink } from '@angular/router';
import { ExpenseStoreService } from '../../../../core/state/expense-store.service';

@Component({
  selector: 'app-budget-indicator',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
  ],
  templateUrl: './budget-indicator.component.html',
  styleUrl: './budget-indicator.component.scss',
})
export class BudgetIndicatorComponent {
  readonly store = inject(ExpenseStoreService);

  readonly progresso = computed(() =>
    Math.min(this.store.percentualConsumido(), 100),
  );

  readonly valorExcedente = computed(() => Math.abs(this.store.saldo()));
}
