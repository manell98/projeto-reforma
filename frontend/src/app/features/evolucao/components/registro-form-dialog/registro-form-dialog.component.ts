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
import { MatTooltipModule } from '@angular/material/tooltip';
import { catchError, concatMap, from, map, of, toArray } from 'rxjs';
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
  /** null = novo(s) registro(s) (com upload); preenchido = edição dos metadados. */
  registro: RegistroObra | null;
}

/** Resultado de um envio em lote: o que subiu com sucesso e o que falhou. */
export interface ResultadoLoteEnvio {
  enviados: RegistroObra[];
  falhas: string[];
}

/**
 * Um arquivo selecionado no lote. A data de captura NÃO é mais individual
 * por arquivo — é um campo único do formulário (`form.controls.dataCaptura`)
 * aplicado a todos os itens no envio, com sugestão automática a partir do
 * primeiro arquivo escolhido (ver `selecionarArquivos`). Motivo: em fotos
 * sem EXIF (ex.: exportadas pelo WhatsApp) e sem uma `lastModified`
 * confiável, a detecção automática cai no fallback "hoje" para o lote
 * inteiro — pior do que deixar o usuário informar a data uma vez e aplicar
 * a todos, que é o que ele efetivamente precisa fazer nesse caso.
 */
interface ItemArquivoLote {
  arquivo: File;
  previewUrl: string;
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
    MatTooltipModule,
  ],
  templateUrl: './registro-form-dialog.component.html',
  styleUrl: './registro-form-dialog.component.scss',
})
export class RegistroFormDialogComponent implements OnDestroy {
  private readonly fb = inject(FormBuilder);
  readonly store = inject(EvolucaoStoreService);
  readonly dialogRef = inject(
    MatDialogRef<RegistroFormDialogComponent, RegistroObra | ResultadoLoteEnvio>,
  );
  readonly data = inject<RegistroFormDialogData>(MAT_DIALOG_DATA);

  readonly mimesAceitos = MIMES_ACEITOS;
  readonly editando = Boolean(this.data.registro);

  /** Arquivos selecionados para envio (modo criação apenas — edição não troca arquivo). */
  readonly itens = signal<ItemArquivoLote[]>([]);
  readonly resumoSelecao = computed(() => {
    const qtd = this.itens().length;
    if (qtd === 0) return '';
    return qtd === 1 ? '1 arquivo selecionado' : `${qtd} arquivos selecionados`;
  });

  /** No modo edição, `tipo` do registro existente não muda durante o diálogo. */
  readonly ehVideo = this.data.registro?.tipo === 'VIDEO';
  readonly erro = signal<string | null>(null);
  readonly salvando = signal(false);
  /** Índice (1-based) do arquivo em envio dentro do lote, para o rótulo de progresso. */
  private readonly indiceLoteAtual = signal(0);

  /** Preview da mídia já enviada — usado apenas no modo edição. */
  readonly previewUrl = computed(() =>
    this.data.registro ? this.store.urlArquivo(this.data.registro) : null,
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
      if (this.editando) return 'Salvar alterações';
      const qtd = this.itens().length;
      return qtd > 1 ? `Enviar ${qtd} registros` : 'Enviar registro';
    }
    if (this.editando) return 'Salvando...';
    const total = this.itens().length;
    return total > 1
      ? `Enviando ${this.indiceLoteAtual()} de ${total}...`
      : 'Enviando...';
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
    for (const item of this.itens()) {
      URL.revokeObjectURL(item.previewUrl);
    }
  }

  /**
   * Seleção múltipla: a data de captura é UM campo só (`form.controls.dataCaptura`),
   * aplicado a todos os arquivos do lote no envio — não mais individual por
   * arquivo (ver comentário em `ItemArquivoLote`). Ao escolher os primeiros
   * arquivos (lote ainda vazio), sugerimos essa data a partir do primeiro
   * arquivo aceito (EXIF -> data do arquivo -> hoje), mas o campo continua
   * livre para o usuário corrigir antes de enviar; adicionar mais arquivos a
   * um lote já iniciado não mexe na data já escolhida. Arquivos já
   * selecionados antes são preservados; a mesma seleção pode ser repetida em
   * várias passagens do input.
   */
  async selecionarArquivos(evento: Event): Promise<void> {
    const input = evento.target as HTMLInputElement;
    const arquivosSelecionados = input.files;
    if (!arquivosSelecionados || arquivosSelecionados.length === 0) return;

    this.erro.set(null);
    const eraVazio = this.itens().length === 0;
    const aceitos = this.mimesAceitos.split(',');
    const novosItens: ItemArquivoLote[] = [];
    const rejeitados: string[] = [];

    for (const arquivo of Array.from(arquivosSelecionados)) {
      if (!aceitos.includes(arquivo.type)) {
        rejeitados.push(arquivo.name);
        continue;
      }
      novosItens.push({ arquivo, previewUrl: URL.createObjectURL(arquivo) });
    }

    if (rejeitados.length > 0) {
      this.erro.set(
        `Formato não suportado, ignorado: ${rejeitados.join(', ')}.`,
      );
    }

    if (eraVazio && novosItens.length > 0) {
      const detectada = await detectarDataCaptura(novosItens[0].arquivo);
      this.dataDetectada = detectada.data;
      this.origemDetectada.set(detectada.origem);
      this.form.controls.dataCaptura.setValue(
        new Date(`${detectada.data}T00:00:00`),
      );
    }

    this.itens.update((atual) => [...atual, ...novosItens]);

    const primeiro = this.itens()[0];
    if (!this.form.controls.titulo.value && primeiro) {
      this.form.controls.titulo.setValue(semExtensao(primeiro.arquivo.name));
    }

    // Permite selecionar novamente os mesmos arquivos após removê-los do lote.
    input.value = '';
  }

  removerItem(indice: number): void {
    const item = this.itens()[indice];
    if (!item) return;
    URL.revokeObjectURL(item.previewUrl);
    this.itens.update((atual) => atual.filter((_, i) => i !== indice));
  }

  salvar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const registroExistente = this.data.registro;

    if (registroExistente) {
      this.salvarEdicao(registroExistente);
      return;
    }

    if (this.itens().length === 0) {
      this.erro.set('Selecione ao menos uma foto ou vídeo para enviar.');
      return;
    }

    this.salvarLote();
  }

  cancelar(): void {
    this.dialogRef.close(undefined);
  }

  private salvarEdicao(registroExistente: RegistroObra): void {
    const valores = this.form.getRawValue();
    const dataCaptura = paraIsoLocal(valores.dataCaptura);
    const titulo = valores.titulo.trim() || null;
    const descricao = valores.descricao.trim() || null;

    this.salvando.set(true);
    this.erro.set(null);

    this.store
      .atualizar(registroExistente.id, { titulo, descricao, dataCaptura })
      .subscribe({
        next: (registro) => this.dialogRef.close(registro),
        error: () => {
          this.salvando.set(false);
          this.erro.set('Não foi possível salvar as alterações.');
        },
      });
  }

  /**
   * Envio sequencial (concatMap): um arquivo de cada vez, título/descrição/
   * data/origem compartilhados pelo lote inteiro (mesmo campo do
   * formulário, `origemAtual()` inclusive — se o usuário mexeu na data
   * sugerida, todos os itens sobem com origem MANUAL). Uma falha num
   * arquivo não interrompe os demais — `store.enviar()` já grava cada
   * sucesso na store assim que termina, então o que já subiu fica salvo
   * mesmo se algo no meio do lote falhar. Ao final o diálogo sempre fecha
   * (os arquivos já enviados já estão persistidos de qualquer forma)
   * reportando para quem chamou quantos deram certo e quais falharam, para
   * a mensagem de sucesso nunca fingir ser total quando não foi.
   */
  private salvarLote(): void {
    const valores = this.form.getRawValue();
    const titulo = valores.titulo.trim() || null;
    const descricao = valores.descricao.trim() || null;
    const dataCaptura = paraIsoLocal(valores.dataCaptura);
    const origemDataCaptura = this.origemAtual();
    const itens = this.itens();

    this.salvando.set(true);
    this.erro.set(null);
    this.indiceLoteAtual.set(0);

    from(itens)
      .pipe(
        concatMap((item, indice) => {
          this.indiceLoteAtual.set(indice + 1);
          return this.store
            .enviar({
              arquivo: item.arquivo,
              titulo,
              descricao,
              dataCaptura,
              origemDataCaptura,
            })
            .pipe(
              map((registro) => ({ ok: true as const, registro })),
              catchError(() =>
                of({ ok: false as const, nome: item.arquivo.name }),
              ),
            );
        }),
        toArray(),
      )
      .subscribe((resultados) => {
        this.salvando.set(false);
        const enviados = resultados
          .filter((r): r is { ok: true; registro: RegistroObra } => r.ok)
          .map((r) => r.registro);
        const falhas = resultados
          .filter((r): r is { ok: false; nome: string } => !r.ok)
          .map((r) => r.nome);

        this.dialogRef.close({ enviados, falhas });
      });
  }
}

function semExtensao(nomeArquivo: string): string {
  return nomeArquivo.replace(/\.[^.]+$/, '');
}
