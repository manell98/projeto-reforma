import { CommonModule } from '@angular/common';
import { Component, HostListener, computed, inject, signal } from '@angular/core';
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
export class VisualizadorDialogComponent {
  private readonly store = inject(EvolucaoStoreService);
  readonly dialogRef = inject(MatDialogRef<VisualizadorDialogComponent>);
  readonly data = inject<VisualizadorDialogData>(MAT_DIALOG_DATA);

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
}
