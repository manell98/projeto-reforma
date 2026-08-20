import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { ExpenseStoreService } from '../../../../core/state/expense-store.service';

@Component({
  selector: 'app-duracao-obra-card',
  standalone: true,
  imports: [CommonModule, RouterLink, MatCardModule, MatButtonModule, MatIconModule],
  templateUrl: './duracao-obra-card.component.html',
  styleUrl: './duracao-obra-card.component.scss',
})
export class DuracaoObraCardComponent {
  readonly store = inject(ExpenseStoreService);
}
