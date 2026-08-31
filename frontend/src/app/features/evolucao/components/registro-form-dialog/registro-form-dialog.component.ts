import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { EvolucaoStoreService } from '../../../../core/state/evolucao-store.service';
import {
  ORIGEM_DATA_CAPTURA_ICONES,
  ORIGEM_DATA_CAPTURA_LABELS,
  OrigemDataCaptura,
  RegistroObra,
} from '../../../../core/models/registro-obra.model';
import { paraIsoLocal } from '../../../../shared/utils/duracao.util';
import { detectarDataCaptura } from '../../../../shared/utils/exif.util';

export interface RegistroFormDialogData {
  /** null = novo registro (com upload); preenchido = edição dos metadados. */
  registro: RegistroObra | null;
}

export const MIMES_ACEITOS =
  'image/jpeg,image/png,image/webp,image/heic,video/mp4,video/quicktime,video/webm';

@Component({
  selector: 'app-registro-form-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './registro-form-dialog.component.html',
  styleUrl: './registro-form-dialog.component.scss',
})
export class RegistroFormDialogComponent implements OnDestroy {
  private readonly fb = inject(FormBuilder);
  readonly store = inject(EvolucaoStoreService);
  readonly dialogRef = inject(
    MatDialogRef<RegistroFormDialogComponent, RegistroObra>,
  );
  readonly data = inject<RegistroFormDialogData>(MAT_DIALOG_DATA);

  readonly mimesAceitos = MIMES_ACEITOS;
  readonly editando = Boolean(this.data.registro);

  readonly arquivo = signal<File | null>(null);
  /** URL local (blob:) para pré-visualizar o arquivo antes do upload. */
  readonly previewLocal = signal<string | null>(null);
  readonly ehVideo = signal(this.data.registro?.tipo === 'VIDEO');
  readonly erro = signal<string | null>(null);
  readonly salvando = signal(false);

  /** Preview do arquivo escolhido agora ou, na edição, da mídia já enviada. */
  readonly previewUrl = computed(
    () =>
      this.previewLocal() ??
      (this.data.registro ? this.store.urlArquivo(this.data.registro) : null),
  );

  private readonly origemDetectada = signal<OrigemDataCaptura>(
    this.data.registro?.origemDataCaptura ?? 'MANUAL',
  );
  private dataDetectada: string | null = this.data.registro
    ? this.data.registro.dataCaptura.slice(0, 10)
    : null;

  /** Rótulo do botão principal, que muda enquanto o envio está em andamento. */
  readonly rotuloBotaoSalvar = computed(() => {
    if (!this.salvando()) {
      return this.editando ? 'Salvar alterações' : 'Enviar registro';
    }
    return this.editando ? 'Salvando...' : 'Enviando...';
  });

  readonly form = this.fb.nonNullable.group({
    titulo: [this.data.registro?.titulo ?? ''],
    descricao: [this.data.registro?.descricao ?? ''],
    dataCaptura: [
      this.data.registro
        ? new Date(`${this.data.registro.dataCaptura.slice(0, 10)}T00:00:00`)
        : new Date(),
      [Validators.required],
    ],
  });

  /** Origem efetiva: mexer na data detectada transforma a origem em MANUAL. */
  readonly origemAtual = computed<OrigemDataCaptura>(() => {
    const detectada = this.origemDetectada();
    if (detectada === 'MANUAL' || !this.dataDetectada) return 'MANUAL';
    return this.dataSelecionadaIso() === this.dataDetectada
      ? detectada
      : 'MANUAL';
  });

  readonly origemLabel = computed(
    () => ORIGEM_DATA_CAPTURA_LABELS[this.origemAtual()],
  );

  readonly origemIcone = computed(
    () => ORIGEM_DATA_CAPTURA_ICONES[this.origemAtual()],
  );

  // Espelha a data escolhida num signal para que `origemAtual` reaja à
  // edição do datepicker (o FormControl continua sendo a fonte enviada).
  private readonly dataSelecionada = signal<Date>(
    this.form.controls.dataCaptura.value,
  );

  private dataSelecionadaIso(): string {
    return paraIsoLocal(this.dataSelecionada());
  }

  constructor() {
    this.form.controls.dataCaptura.valueChanges.subscribe((valor) => {
      if (valor) {
        this.dataSelecionada.set(valor);
      }
    });
  }

  ngOnDestroy(): void {
    this.liberarPreview();
  }

  async selecionarArquivo(evento: Event): Promise<void> {
    const input = evento.target as HTMLInputElement;
    const arquivo = input.files?.[0];
    if (!arquivo) return;

    this.liberarPreview();
    this.erro.set(null);
    this.arquivo.set(arquivo);
    this.ehVideo.set(arquivo.type.startsWith('video/'));
    this.previewLocal.set(URL.createObjectURL(arquivo));

    const detectada = await detectarDataCaptura(arquivo);
    this.dataDetectada = detectada.data;
    this.origemDetectada.set(detectada.origem);
    this.form.controls.dataCaptura.setValue(
      new Date(`${detectada.data}T00:00:00`),
    );

    if (!this.form.controls.titulo.value) {
      this.form.controls.titulo.setValue(semExtensao(arquivo.name));
    }
  }

  salvar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (!this.editando && !this.arquivo()) {
      this.erro.set('Selecione uma foto ou um vídeo para enviar.');
      return;
    }

    const valores = this.form.getRawValue();
    const dataCaptura = paraIsoLocal(valores.dataCaptura);
    const titulo = valores.titulo.trim() || null;
    const descricao = valores.descricao.trim() || null;

    this.salvando.set(true);
    this.erro.set(null);

    const registroExistente = this.data.registro;
    const requisicao = registroExistente
      ? this.store.atualizar(registroExistente.id, {
          titulo,
          descricao,
          dataCaptura,
        })
      : this.store.enviar({
          arquivo: this.arquivo() as File,
          titulo,
          descricao,
          dataCaptura,
          origemDataCaptura: this.origemAtual(),
        });

    requisicao.subscribe({
      next: (registro) => this.dialogRef.close(registro),
      error: () => {
        this.salvando.set(false);
        this.erro.set(
          registroExistente
            ? 'Não foi possível salvar as alterações.'
            : 'Não foi possível enviar o arquivo. Verifique o tamanho e o formato.',
        );
      },
    });
  }

  cancelar(): void {
    this.dialogRef.close(undefined);
  }

  private liberarPreview(): void {
    const url = this.previewLocal();
    if (url) {
      URL.revokeObjectURL(url);
      this.previewLocal.set(null);
    }
  }
}

function semExtensao(nomeArquivo: string): string {
  return nomeArquivo.replace(/\.[^.]+$/, '');
}
