import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { map } from 'rxjs';
import { ExpenseStoreService } from './core/state/expense-store.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  private readonly store = inject(ExpenseStoreService);
  private readonly breakpointObserver = inject(BreakpointObserver);

  readonly modoOverlay = signal(false);
  readonly sidenavAberta = signal(true);

  private readonly telaEstreita = this.breakpointObserver
    .observe(Breakpoints.Handset)
    .pipe(map((result) => result.matches));

  ngOnInit(): void {
    this.store.carregarInicial();
    this.telaEstreita.subscribe((estreita) => {
      this.modoOverlay.set(estreita);
      this.sidenavAberta.set(!estreita);
    });
  }

  alternarSidenav(): void {
    this.sidenavAberta.update((aberta) => !aberta);
  }

  fecharSidenavSeOverlay(): void {
    if (this.modoOverlay()) {
      this.sidenavAberta.set(false);
    }
  }
}
