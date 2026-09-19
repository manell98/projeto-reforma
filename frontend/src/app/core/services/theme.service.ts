import { Injectable, signal } from '@angular/core';

const CHAVE_ARMAZENAMENTO = 'reforma-tema';

type TemaSalvo = 'light' | 'dark';

/**
 * Controla o tema claro/escuro do app. A escolha explícita do usuário
 * (botão sol/lua no topbar) é persistida em localStorage e sempre vence;
 * sem uma escolha salva, o `prefers-color-scheme` do sistema decide — nesse
 * caso não escrevemos `data-theme` nenhum no <html>, deixando o `@media` de
 * styles.scss cuidar disso sozinho.
 *
 * O signal `escuro` existe à parte do atributo do DOM porque os gráficos
 * ApexCharts (expense-charts, payment-method-charts) precisam recalcular a
 * cor de texto hardcoded (`TEXTO_COR`) em TypeScript, não só via CSS.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly mediaEscura = window.matchMedia('(prefers-color-scheme: dark)');

  readonly escuro = signal(this.calcularEscuroInicial());

  constructor() {
    this.aplicarAtributo();
    this.mediaEscura.addEventListener('change', (evento) => {
      if (!this.preferenciaSalva()) {
        this.escuro.set(evento.matches);
      }
    });
  }

  alternar(): void {
    const novoEscuro = !this.escuro();
    this.escuro.set(novoEscuro);
    localStorage.setItem(CHAVE_ARMAZENAMENTO, novoEscuro ? 'dark' : 'light');
    this.aplicarAtributo();
  }

  private preferenciaSalva(): TemaSalvo | null {
    const salvo = localStorage.getItem(CHAVE_ARMAZENAMENTO);
    return salvo === 'dark' || salvo === 'light' ? salvo : null;
  }

  private calcularEscuroInicial(): boolean {
    const salvo = this.preferenciaSalva();
    return salvo ? salvo === 'dark' : this.mediaEscura.matches;
  }

  private aplicarAtributo(): void {
    const salvo = this.preferenciaSalva();
    if (salvo) {
      document.documentElement.setAttribute('data-theme', salvo);
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }
}
