import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { EvolucaoStoreService } from '../../../../core/state/evolucao-store.service';
import {
  ORIGEM_DATA_CAPTURA_LABELS,
  RegistroObra,
} from '../../../../core/models/registro-obra.model';

export interface VisualizadorDialogData {
  /** Álbum do dia ao qual o item aberto pertence, na ordem exibida em tela. */
  registros: RegistroObra[];
  indiceInicial: number;
}

@Component({
  selector: 'app-visualizador-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
  ],
  templateUrl: './visualizador-dialog.component.html',
  styleUrl: './visualizador-dialog.component.scss',
})
export class VisualizadorDialogComponent implements OnDestroy {
  private readonly store = inject(EvolucaoStoreService);
  readonly dialogRef = inject(MatDialogRef<VisualizadorDialogComponent>);
  readonly data = inject<VisualizadorDialogData>(MAT_DIALOG_DATA);

  @ViewChild('palco') private readonly palco?: ElementRef<HTMLElement>;

  // Alguns navegadores móveis (Safari < 16.4) não implementam a Fullscreen
  // API em elementos arbitrários — o botão simplesmente não aparece nesses
  // casos, em vez de existir e não fazer nada ao ser clicado.
  readonly suportaFullscreen =
    typeof document !== 'undefined' && !!document.fullscreenEnabled;

  readonly estaFullscreen = signal(false);

  private readonly indiceAtual = signal(this.data.indiceInicial);

  readonly registro = computed(() => this.data.registros[this.indiceAtual()]);
  readonly url = computed(() => this.store.urlArquivo(this.registro()));
  readonly origemLabel = computed(
    () => ORIGEM_DATA_CAPTURA_LABELS[this.registro().origemDataCaptura],
  );

  readonly temMultiplos = this.data.registros.length > 1;
  readonly temAnterior = computed(() => this.indiceAtual() > 0);
  readonly temProximo = computed(
    () => this.indiceAtual() < this.data.registros.length - 1,
  );
  readonly posicaoLabel = computed(
    () => `${this.indiceAtual() + 1} de ${this.data.registros.length}`,
  );

  // Navegação não é cíclica de propósito: nas bordas do álbum a seta
  // correspondente só fica desabilitada, em vez de voltar ao início/fim do
  // dia silenciosamente — é mais previsível para o usuário.
  @HostListener('document:keydown.arrowright')
  proximo(): void {
    if (this.temProximo()) {
      this.indiceAtual.update((indice) => indice + 1);
    }
  }

  @HostListener('document:keydown.arrowleft')
  anterior(): void {
    if (this.temAnterior()) {
      this.indiceAtual.update((indice) => indice - 1);
    }
  }

  // Mantém `estaFullscreen` correto mesmo quando o usuário sai da tela cheia
  // pelo Esc do navegador (que o próprio navegador intercepta antes do Esc
  // chegar a fechar o diálogo) em vez de pelo nosso botão.
  @HostListener('document:fullscreenchange')
  aoMudarFullscreen(): void {
    this.estaFullscreen.set(document.fullscreenElement === this.palco?.nativeElement);
  }

  alternarFullscreen(): void {
    if (!this.palco) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      this.palco.nativeElement.requestFullscreen().catch(() => {
        // Alguns navegadores recusam sem gesto do usuário "fresco" o
        // suficiente ou por outra restrição — não há nada útil a fazer além
        // de deixar o botão como estava; `estaFullscreen` só muda de fato
        // via `fullscreenchange`, então nunca fica "mentindo" no estado.
      });
    }
  }

  // Sair do diálogo sem sair da tela cheia deixaria o navegador preso nela
  // (mostrando o card de detalhes já fechado atrás do vazio) — se fomos nós
  // que entramos em fullscreen, saímos ao fechar.
  ngOnDestroy(): void {
    if (document.fullscreenElement === this.palco?.nativeElement) {
      document.exitFullscreen();
    }
  }
}
