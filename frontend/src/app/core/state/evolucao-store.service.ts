import { HttpEventType, HttpResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, filter, finalize, map, tap } from 'rxjs';
import { EvolucaoService } from '../services/evolucao.service';
import {
  AtualizacaoRegistroObra,
  NovoRegistroObra,
  RegistroObra,
} from '../models/registro-obra.model';

export interface DiaDeRegistros {
  /** Data de captura no formato "YYYY-MM-DD". */
  data: string;
  registros: RegistroObra[];
}

/**
 * Store dedicada à evolução da obra (fotos/vídeos), separada da
 * ExpenseStoreService de propósito:
 *
 * - não há dependência circular entre mídias e despesas/orçamentos — nenhum
 *   cálculo de uma precisa da outra, então não existe o motivo que obrigou a
 *   unificar despesas + orçamentos + obra numa store só;
 * - mídia é pesada demais para entrar no forkJoin inicial do AppComponent: a
 *   lista de registros só é carregada quando a própria tela /evolucao abre,
 *   sem onerar o boot da dashboard e das demais telas.
 */
@Injectable({ providedIn: 'root' })
export class EvolucaoStoreService {
  private readonly evolucaoService = inject(EvolucaoService);

  private readonly _registros = signal<RegistroObra[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _enviando = signal(false);
  private readonly _progressoEnvio = signal(0);

  readonly registros = this._registros.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly enviando = this._enviando.asReadonly();
  readonly progressoEnvio = this._progressoEnvio.asReadonly();

  /** Registros agrupados por dia de captura, do mais recente para o mais antigo. */
  readonly porDia = computed<DiaDeRegistros[]>(() => {
    const agrupado = new Map<string, RegistroObra[]>();
    for (const registro of this._registros()) {
      const dia = registro.dataCaptura.slice(0, 10);
      const doDia = agrupado.get(dia) ?? [];
      doDia.push(registro);
      agrupado.set(dia, doDia);
    }
    return Array.from(agrupado.entries())
      .map(([data, registros]) => ({ data, registros: this.ordenarDia(registros) }))
      .sort((a, b) => b.data.localeCompare(a.data));
  });

  // Dentro de um dia, respeita a ordem manual (arrastar-e-soltar) quando ela
  // existe. `reordenarDia` sempre grava `ordem` em TODOS os registros do dia
  // de uma vez (nunca só nos que mudaram de posição), então um dia nunca
  // fica com mistura de itens com/sem ordem manual: ou todos têm `ordem`
  // (já foi reordenado alguma vez), ou nenhum tem (usa o fallback natural).
  private ordenarDia(registros: RegistroObra[]): RegistroObra[] {
    const temOrdemManual = registros.some((r) => r.ordem !== null);
    if (temOrdemManual) {
      return [...registros].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
    }
    return [...registros].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  readonly total = computed(() => this._registros().length);

  readonly totalFotos = computed(
    () => this._registros().filter((r) => r.tipo === 'FOTO').length,
  );

  readonly totalVideos = computed(
    () => this._registros().filter((r) => r.tipo === 'VIDEO').length,
  );

  readonly diasRegistrados = computed(() => this.porDia().length);

  carregar(): void {
    // O spinner só aparece quando ainda não há nada em tela: ao voltar para a
    // página, a lista atual continua visível enquanto os dados são revalidados.
    this._loading.set(this._registros().length === 0);
    this._error.set(null);

    this.evolucaoService
      .listar()
      .pipe(finalize(() => this._loading.set(false)))
      .subscribe({
        next: (registros) => this._registros.set(registros),
        error: () =>
          this._error.set(
            'Não foi possível carregar os registros da obra. Verifique se a API está rodando.',
          ),
      });
  }

  /**
   * Envia o arquivo alimentando `progressoEnvio` (0 a 100) durante o upload e
   * emite uma única vez, com o registro já criado.
   */
  enviar(novo: NovoRegistroObra): Observable<RegistroObra> {
    this._enviando.set(true);
    this._progressoEnvio.set(0);

    return this.evolucaoService.criar(novo).pipe(
      tap((evento) => {
        if (evento.type === HttpEventType.UploadProgress && evento.total) {
          this._progressoEnvio.set(
            Math.round((evento.loaded / evento.total) * 100),
          );
        }
      }),
      filter(
        (evento): evento is HttpResponse<RegistroObra> =>
          evento.type === HttpEventType.Response,
      ),
      map((resposta) => resposta.body as RegistroObra),
      tap((registro) => this.adicionarLocal(registro)),
      finalize(() => this._enviando.set(false)),
    );
  }

  atualizar(id: string, dados: AtualizacaoRegistroObra) {
    return this.evolucaoService.atualizar(id, dados);
  }

  remover(id: string) {
    return this.evolucaoService.remover(id);
  }

  /**
   * Grava a nova ordem manual de um álbum (arrastar-e-soltar) — `ids` é a
   * lista COMPLETA dos registros daquele dia, na nova ordem. Aplica a ordem
   * localmente na hora (otimista, sem esperar a resposta do servidor: soltar
   * o item já reflete na tela) e dispara a chamada; se ela falhar, quem
   * chama decide como recuperar (ex.: `carregar()` de novo) — o método não
   * reverte sozinho porque nesse ponto o usuário já viu o resultado.
   */
  reordenarDia(ids: string[]): Observable<RegistroObra[]> {
    const posicaoPorId = new Map(ids.map((id, indice) => [id, indice]));
    this._registros.update((atual) =>
      atual.map((registro) =>
        posicaoPorId.has(registro.id)
          ? { ...registro, ordem: posicaoPorId.get(registro.id)! }
          : registro,
      ),
    );
    return this.evolucaoService.reordenar(ids);
  }

  urlArquivo(registro: RegistroObra): string {
    return this.evolucaoService.urlArquivo(registro);
  }

  adicionarLocal(registro: RegistroObra): void {
    this._registros.update((atual) => this.ordenar([...atual, registro]));
  }

  atualizarLocal(registro: RegistroObra): void {
    this._registros.update((atual) =>
      this.ordenar(
        atual.map((item) => (item.id === registro.id ? registro : item)),
      ),
    );
  }

  removerLocal(id: string): void {
    this._registros.update((atual) => atual.filter((item) => item.id !== id));
  }

  // Mesma ordenação do backend: data de captura desc e, dentro do mesmo dia,
  // o upload mais recente primeiro.
  private ordenar(registros: RegistroObra[]): RegistroObra[] {
    return [...registros].sort((a, b) => {
      const porCaptura = b.dataCaptura.localeCompare(a.dataCaptura);
      return porCaptura !== 0
        ? porCaptura
        : b.createdAt.localeCompare(a.createdAt);
    });
  }
}
