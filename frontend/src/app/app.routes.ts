import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then(
        (m) => m.DashboardComponent,
      ),
  },
  {
    path: 'despesas',
    loadComponent: () =>
      import('./features/expenses/expenses-list.component').then(
        (m) => m.ExpensesListComponent,
      ),
  },
  {
    path: 'formas-pagamento',
    loadComponent: () =>
      import('./features/payment-methods/payment-methods.component').then(
        (m) => m.PaymentMethodsComponent,
      ),
  },
  {
    path: 'evolucao',
    loadComponent: () =>
      import('./features/evolucao/evolucao.component').then(
        (m) => m.EvolucaoComponent,
      ),
  },
  {
    path: 'configuracoes/orcamento',
    loadComponent: () =>
      import(
        './features/settings/orcamento-config/orcamento-config.component'
      ).then((m) => m.OrcamentoConfigComponent),
  },
  {
    path: 'configuracoes/obra',
    loadComponent: () =>
      import('./features/settings/obra-config/obra-config.component').then(
        (m) => m.ObraConfigComponent,
      ),
  },
  { path: '**', redirectTo: 'dashboard' },
];
