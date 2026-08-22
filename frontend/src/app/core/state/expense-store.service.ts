import { Injectable, computed, signal } from '@angular/core';
import { finalize, forkJoin } from 'rxjs';
import { ExpenseService } from '../services/expense.service';
import { OrcamentoService } from '../services/orcamento.service';
import { ObraService } from '../services/obra.service';
import {
  CategoriaOption,
  Expense,
  ExpensePayload,
} from '../models/expense.model';
import {
  OrcamentoTipo,
  TipoOrcamentoEspecifico,
} from '../models/orcamento.model';
import { Obra, ObraPayload } from '../models/obra.model';
import {
  calcularDias,
  formatarDuracaoAmigavel,
  hojeLocal,
  paraDataLocal,
} from '../../shared/utils/duracao.util';

export interface CategoriaTotal {
  categoria: string;
  label: string;
  total: number;
  quantidade: number;
  percentual: number;
}

export interface MesTotal {
  mes: string;
  total: number;
}

export type StatusObra = 'sem-inicio' | 'em-andamento' | 'finalizada';

const OBRA_VAZIA: Obra = { dataInicio: null, dataTermino: null };

const ORCAMENTOS_VAZIOS: Record<OrcamentoTipo, number> = {
  GERAL: 0,
  PEDREIRO: 0,
  ELETRICISTA: 0,
  TIO_NEGUINHO: 0,
  MARCENEIRO: 0,
  MARMOREIRO: 0,
};

// Os cinco tipos com orçamento específico têm o MESMO valor de string que a
// Categoria correspondente ('PEDREIRO', 'ELETRICISTA', 'TIO_NEGUINHO',
// 'MARCENEIRO', 'MARMOREIRO') — por isso o gasto de cada um pode ser derivado
// diretamente das despesas filtrando por categoria, sem precisar de nenhuma
// tabela/CRUD à parte.
const TIPOS_ORCAMENTO_ESPECIFICO: TipoOrcamentoEspecifico[] = [
  'PEDREIRO',
  'ELETRICISTA',
  'TIO_NEGUINHO',
  'MARCENEIRO',
  'MARMOREIRO',
];

@Injectable({ providedIn: 'root' })
export class ExpenseStoreService {
  private readonly _expenses = signal<Expense[]>([]);
  private readonly _categorias = signal<CategoriaOption[]>([]);
  private readonly _orcamentos = signal<Record<OrcamentoTipo, number>>({
    ...ORCAMENTOS_VAZIOS,
  });
  private readonly _obra = signal<Obra>(OBRA_VAZIA);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _pronto = signal(false);

  // Sempre a lista COMPLETA de despesas (sem filtro) — é a fonte de verdade
  // tanto da dashboard (que não tem filtros) quanto da tela de Despesas (que
  // filtra essa mesma lista no cliente). Também é a ÚNICA fonte dos gastos do
  // Pedreiro/Eletricista/Tio Neguinho: não existe cadastro de gasto separado
  // para eles, o valor gasto de cada um vem de filtrar esta mesma lista pela
  // categoria — cadastrar/editar/excluir uma despesa dessas categorias já
  // atualiza automaticamente o orçamento específico correspondente.
  readonly expenses = this._expenses.asReadonly();
  readonly categorias = this._categorias.asReadonly();
  readonly obra = this._obra.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  // Sinaliza quando a carga inicial termina, para que os gráficos só sejam
  // montados com os dados finais em mãos: ng-apexcharts recria seu gráfico via
  // import() dinâmico, e montá-lo mais de uma vez em sequência rápida (ex: uma
  // atualização logo após o primeiro carregamento) pode gerar uma corrida em
  // que uma instância antiga tenta renderizar em um elemento já substituído.
  readonly pronto = this._pronto.asReadonly();

  readonly categoriaLabels = computed(() => {
    const map = new Map<string, string>();
    for (const c of this._categorias()) {
      map.set(c.valor, c.label);
    }
    return map;
  });

  readonly totalGasto = computed(() =>
    this._expenses().reduce((soma, despesa) => soma + despesa.valor, 0),
  );

  readonly quantidadeDespesas = computed(() => this._expenses().length);

  readonly maiorDespesa = computed(() => {
    const despesas = this._expenses();
    if (despesas.length === 0) return null;
    return despesas.reduce((maior, atual) =>
      atual.valor > maior.valor ? atual : maior,
    );
  });

  readonly porCategoria = computed<CategoriaTotal[]>(() => {
    const despesas = this._expenses();
    const labels = this.categoriaLabels();
    const total = this.totalGasto();

    const agrupado = new Map<string, { total: number; quantidade: number }>();
    for (const despesa of despesas) {
      const atual = agrupado.get(despesa.categoria) ?? {
        total: 0,
        quantidade: 0,
      };
      atual.total += despesa.valor;
      atual.quantidade += 1;
      agrupado.set(despesa.categoria, atual);
    }

    return Array.from(agrupado.entries())
      .map(([categoria, valores]) => ({
        categoria,
        label: labels.get(categoria) ?? categoria,
        total: valores.total,
        quantidade: valores.quantidade,
        percentual: total > 0 ? (valores.total / total) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);
  });

  readonly categoriaQueMaisGastou = computed(
    () => this.porCategoria()[0] ?? null,
  );

  readonly evolucaoMensal = computed<MesTotal[]>(() => {
    const agrupado = new Map<string, number>();
    for (const despesa of this._expenses()) {
      const mes = despesa.data.slice(0, 7);
      agrupado.set(mes, (agrupado.get(mes) ?? 0) + despesa.valor);
    }
    return Array.from(agrupado.entries())
      .map(([mes, total]) => ({ mes, total }))
      .sort((a, b) => a.mes.localeCompare(b.mes));
  });

  readonly ultimasDespesas = computed(() => this._expenses().slice(0, 5));

  // --- Orçamento geral ---------------------------------------------------
  // O orçamento geral representa o total disponível para a reforma. Dele são
  // descontados: (1) o total DESTINADO aos orçamentos específicos (Pedreiro,
  // Eletricista, Tio Neguinho) — reservado, mesmo que ainda não gasto — e
  // (2) o total GASTO em todas as despesas, de qualquer categoria (inclusive
  // as de Pedreiro/Eletricista/Tio Neguinho: a despesa em si é o gasto real,
  // já a "destinação" é só o teto reservado, então os dois números não se
  // sobrepõem — cada um mede uma coisa diferente).
  readonly orcamento = computed(() => this._orcamentos().GERAL);

  readonly totalComprometido = computed(() =>
    TIPOS_ORCAMENTO_ESPECIFICO.reduce(
      (soma, tipo) => soma + this._orcamentos()[tipo],
      0,
    ),
  );

  readonly orcamentoConfigurado = computed(() => this.orcamento() > 0);

  readonly saldo = computed(
    () => this.orcamento() - this.totalComprometido() - this.totalGasto(),
  );

  readonly percentualConsumido = computed(() => {
    const orcamento = this.orcamento();
    if (orcamento <= 0) return 0;
    return ((this.totalComprometido() + this.totalGasto()) / orcamento) * 100;
  });

  readonly orcamentoExcedido = computed(
    () => this.orcamentoConfigurado() && this.saldo() < 0,
  );

  // --- Orçamentos específicos (Pedreiro, Eletricista, Tio Neguinho) ------
  // O gasto de cada um vem de filtrar as despesas por categoria — nunca de um
  // cadastro à parte.
  private readonly gastoPorTipoEspecifico = computed(() => {
    const mapa = new Map<TipoOrcamentoEspecifico, number>();
    for (const despesa of this._expenses()) {
      if (
        TIPOS_ORCAMENTO_ESPECIFICO.includes(
          despesa.categoria as TipoOrcamentoEspecifico,
        )
      ) {
        const tipo = despesa.categoria as TipoOrcamentoEspecifico;
        mapa.set(tipo, (mapa.get(tipo) ?? 0) + despesa.valor);
      }
    }
    return mapa;
  });

  orcamentoEspecifico(tipo: TipoOrcamentoEspecifico): number {
    return this._orcamentos()[tipo];
  }

  totalGastoEspecifico(tipo: TipoOrcamentoEspecifico): number {
    return this.gastoPorTipoEspecifico().get(tipo) ?? 0;
  }

  saldoEspecifico(tipo: TipoOrcamentoEspecifico): number {
    return this.orcamentoEspecifico(tipo) - this.totalGastoEspecifico(tipo);
  }

  percentualEspecificoConsumido(tipo: TipoOrcamentoEspecifico): number {
    const orcamento = this.orcamentoEspecifico(tipo);
    if (orcamento <= 0) return 0;
    return (this.totalGastoEspecifico(tipo) / orcamento) * 100;
  }

  orcamentoEspecificoConfigurado(tipo: TipoOrcamentoEspecifico): boolean {
    return this.orcamentoEspecifico(tipo) > 0;
  }

  excedidoEspecifico(tipo: TipoOrcamentoEspecifico): boolean {
    return (
      this.orcamentoEspecificoConfigurado(tipo) &&
      this.saldoEspecifico(tipo) < 0
    );
  }

  // --- Obra ----------------------------------------------------------------

  readonly statusObra = computed<StatusObra>(() => {
    const obra = this._obra();
    if (!obra.dataInicio) return 'sem-inicio';
    return obra.dataTermino ? 'finalizada' : 'em-andamento';
  });

  readonly duracaoObraDias = computed(() => {
    const obra = this._obra();
    if (!obra.dataInicio) return 0;
    const inicio = paraDataLocal(obra.dataInicio);
    const fim = obra.dataTermino ? paraDataLocal(obra.dataTermino) : hojeLocal();
    return calcularDias(inicio, fim);
  });

  readonly duracaoObraTexto = computed(() =>
    formatarDuracaoAmigavel(this.duracaoObraDias()),
  );

  constructor(
    private readonly expenseService: ExpenseService,
    private readonly orcamentoService: OrcamentoService,
    private readonly obraService: ObraService,
  ) {}

  carregarInicial(): void {
    this._loading.set(true);
    this._error.set(null);
    forkJoin({
      categorias: this.expenseService.getCategorias(),
      despesas: this.expenseService.getAll(),
      orcamentos: this.orcamentoService.listar(),
      obra: this.obraService.obter(),
    })
      .pipe(finalize(() => this._loading.set(false)))
      .subscribe({
        next: ({ categorias, despesas, orcamentos, obra }) => {
          this._categorias.set(categorias);
          this._expenses.set(despesas);
          this._orcamentos.set({
            ...ORCAMENTOS_VAZIOS,
            ...Object.fromEntries(orcamentos.map((o) => [o.tipo, o.valor])),
          });
          this._obra.set(obra);
          this._pronto.set(true);
        },
        error: () => {
          this._error.set(
            'Não foi possível carregar os dados. Verifique se a API está rodando.',
          );
          this._pronto.set(true);
        },
      });
  }

  carregarDespesas(): void {
    this._loading.set(true);
    this._error.set(null);
    this.expenseService
      .getAll()
      .pipe(finalize(() => this._loading.set(false)))
      .subscribe({
        next: (expenses) => this._expenses.set(expenses),
        error: () =>
          this._error.set(
            'Não foi possível carregar as despesas. Verifique se a API está rodando.',
          ),
      });
  }

  criar(payload: ExpensePayload) {
    return this.expenseService.create(payload);
  }

  atualizar(id: string, payload: ExpensePayload) {
    return this.expenseService.update(id, payload);
  }

  remover(id: string) {
    return this.expenseService.remove(id);
  }

  // Atualiza a lista localmente em vez de refazer o GET /expenses inteiro
  // após criar/editar/excluir — evita o "flash" de loading que desmontava a
  // tabela inteira e jogava a página pro topo a cada salvamento.
  adicionarDespesaLocal(despesa: Expense): void {
    this._expenses.update((atual) =>
      [...atual, despesa].sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0)),
    );
  }

  atualizarDespesaLocal(despesa: Expense): void {
    this._expenses.update((atual) =>
      atual
        .map((item) => (item.id === despesa.id ? despesa : item))
        .sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0)),
    );
  }

  removerDespesaLocal(id: string): void {
    this._expenses.update((atual) => atual.filter((item) => item.id !== id));
  }

  atualizarOrcamento(tipo: OrcamentoTipo, valor: number) {
    return this.orcamentoService.atualizar(tipo, valor);
  }

  definirOrcamentoLocal(tipo: OrcamentoTipo, valor: number): void {
    this._orcamentos.update((atual) => ({ ...atual, [tipo]: valor }));
  }

  atualizarObra(payload: ObraPayload) {
    return this.obraService.atualizar(payload);
  }

  definirObraLocal(obra: Obra): void {
    this._obra.set(obra);
  }
}
