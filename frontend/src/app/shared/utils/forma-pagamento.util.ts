import { Expense, FormaPagamento } from '../../core/models/expense.model';

// Rótulo direto da forma de pagamento persistida (sem o agrupamento de
// relatório abaixo), usado nas listagens de despesa.
export const FORMA_PAGAMENTO_LABELS: Record<FormaPagamento, string> = {
  PIX: 'Pix',
  CARTAO_CREDITO: 'Cartão de crédito',
};

export const FORMA_PAGAMENTO_NAO_INFORMADO = 'Não informado';

export function formaPagamentoLabel(despesa: Expense): string {
  return despesa.formaPagamento
    ? FORMA_PAGAMENTO_LABELS[despesa.formaPagamento]
    : FORMA_PAGAMENTO_NAO_INFORMADO;
}

/**
 * Quantidade de parcelas para exibição. Pix nunca tem parcelas (o campo é
 * null por definição), então vira um traço — nunca "null" ou "0".
 */
export function parcelasLabel(despesa: Expense): string {
  return despesa.formaPagamento === 'CARTAO_CREDITO' && despesa.parcelas
    ? `${despesa.parcelas}x`
    : '—';
}

// Agrupamento de exibição para a aba "Formas de pagamento": Pix e Cartão de
// crédito (`Expense.formaPagamento`) são os valores estruturados persistidos;
// o cartão é subdividido em 1x/parcelado a partir de `Expense.parcelas` só
// para fins de relatório. NAO_INFORMADO cobre despesas cadastradas antes
// desse campo existir — nunca é inferido a partir da observação.
export type GrupoFormaPagamento =
  | 'PIX'
  | 'CREDITO_1X'
  | 'CREDITO_PARCELADO'
  | 'NAO_INFORMADO';

export const GRUPO_FORMA_PAGAMENTO_LABELS: Record<GrupoFormaPagamento, string> = {
  PIX: 'Pix',
  CREDITO_1X: 'Crédito 1x (à vista)',
  CREDITO_PARCELADO: 'Crédito parcelado',
  NAO_INFORMADO: 'Não informado',
};

export interface FormaPagamentoResumo {
  quantidade: number;
  valor: number;
  percentual: number;
}

export interface ParcelaResumo {
  parcelas: number;
  quantidade: number;
  valor: number;
}

export interface ResumoFormasPagamento {
  totalAnalisado: { quantidade: number; valor: number };
  pix: FormaPagamentoResumo;
  cartao: FormaPagamentoResumo;
  creditoAvista: FormaPagamentoResumo;
  creditoParcelado: FormaPagamentoResumo;
  naoInformado: FormaPagamentoResumo;
  distribuicaoParcelas: ParcelaResumo[];
}

export function grupoFormaPagamento(despesa: Expense): GrupoFormaPagamento {
  if (despesa.formaPagamento === 'PIX') return 'PIX';
  if (despesa.formaPagamento === 'CARTAO_CREDITO') {
    return despesa.parcelas === 1 ? 'CREDITO_1X' : 'CREDITO_PARCELADO';
  }
  return 'NAO_INFORMADO';
}

export function resumirFormasPagamento(despesas: Expense[]): ResumoFormasPagamento {
  const valorTotal = despesas.reduce((soma, despesa) => soma + despesa.valor, 0);

  const resumirGrupo = (
    predicado: (despesa: Expense) => boolean,
  ): FormaPagamentoResumo => {
    const doGrupo = despesas.filter(predicado);
    const valor = doGrupo.reduce((soma, despesa) => soma + despesa.valor, 0);
    return {
      quantidade: doGrupo.length,
      valor,
      percentual: valorTotal > 0 ? (valor / valorTotal) * 100 : 0,
    };
  };

  const distribuicaoMap = new Map<number, { quantidade: number; valor: number }>();
  for (const despesa of despesas) {
    if (despesa.formaPagamento !== 'CARTAO_CREDITO' || despesa.parcelas === null) {
      continue;
    }
    const atual = distribuicaoMap.get(despesa.parcelas) ?? {
      quantidade: 0,
      valor: 0,
    };
    atual.quantidade += 1;
    atual.valor += despesa.valor;
    distribuicaoMap.set(despesa.parcelas, atual);
  }
  const distribuicaoParcelas = Array.from(distribuicaoMap.entries())
    .map(([parcelas, valores]) => ({ parcelas, ...valores }))
    .sort((a, b) => a.parcelas - b.parcelas);

  return {
    totalAnalisado: { quantidade: despesas.length, valor: valorTotal },
    pix: resumirGrupo((d) => d.formaPagamento === 'PIX'),
    cartao: resumirGrupo((d) => d.formaPagamento === 'CARTAO_CREDITO'),
    creditoAvista: resumirGrupo((d) => grupoFormaPagamento(d) === 'CREDITO_1X'),
    creditoParcelado: resumirGrupo(
      (d) => grupoFormaPagamento(d) === 'CREDITO_PARCELADO',
    ),
    naoInformado: resumirGrupo((d) => d.formaPagamento === null),
    distribuicaoParcelas,
  };
}
