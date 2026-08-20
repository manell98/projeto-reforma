import { Component } from '@angular/core';
import { BudgetIndicatorComponent } from './components/budget-indicator/budget-indicator.component';
import { DuracaoObraCardComponent } from './components/duracao-obra-card/duracao-obra-card.component';
import { SummaryCardsComponent } from './components/summary-cards/summary-cards.component';
import { ExpenseChartsComponent } from './components/expense-charts/expense-charts.component';
import { OrcamentoEspecificoPanelComponent } from '../settings/orcamento-config/components/orcamento-especifico-panel/orcamento-especifico-panel.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    BudgetIndicatorComponent,
    DuracaoObraCardComponent,
    SummaryCardsComponent,
    ExpenseChartsComponent,
    OrcamentoEspecificoPanelComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {}
