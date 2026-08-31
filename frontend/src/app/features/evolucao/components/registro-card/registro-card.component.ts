import { CommonModule } from '@angular/common';
import { Component, computed, inject, input, output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { EvolucaoStoreService } from '../../../../core/state/evolucao-store.service';
import {
  ORIGEM_DATA_CAPTURA_ICONES,
  ORIGEM_DATA_CAPTURA_LABELS,
  ORIGEM_DATA_CAPTURA_RESUMO,
  RegistroObra,
} from '../../../../core/models/registro-obra.model';

@Component({
  selector: 'app-registro-card',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './registro-card.component.html',
  styleUrl: './registro-card.component.scss',
})
export class RegistroCardComponent {
  private readonly store = inject(EvolucaoStoreService);

  readonly registro = input.required<RegistroObra>();

  readonly abrir = output<RegistroObra>();
  readonly editar = output<RegistroObra>();
  readonly excluir = output<RegistroObra>();

  readonly url = computed(() => this.store.urlArquivo(this.registro()));

  readonly origemLabel = computed(
    () => ORIGEM_DATA_CAPTURA_LABELS[this.registro().origemDataCaptura],
  );

  readonly origemResumo = computed(
    () => ORIGEM_DATA_CAPTURA_RESUMO[this.registro().origemDataCaptura],
  );

  readonly origemIcone = computed(
    () => ORIGEM_DATA_CAPTURA_ICONES[this.registro().origemDataCaptura],
  );

  readonly tamanhoLegivel = computed(() => {
    const mb = this.registro().tamanhoBytes / (1024 * 1024);
    return mb >= 1
      ? `${mb.toFixed(1)} MB`
      : `${Math.max(1, Math.round(this.registro().tamanhoBytes / 1024))} KB`;
  });

  /** Duração do vídeo em "m:ss", quando o navegador consegue lê-la. */
  readonly duracao = signal<string | null>(null);

  registrarDuracao(evento: Event): void {
    const video = evento.target as HTMLVideoElement;
    if (!Number.isFinite(video.duration) || video.duration <= 0) return;
    const total = Math.round(video.duration);
    const minutos = Math.floor(total / 60);
    const segundos = `${total % 60}`.padStart(2, '0');
    this.duracao.set(`${minutos}:${segundos}`);
  }
}
