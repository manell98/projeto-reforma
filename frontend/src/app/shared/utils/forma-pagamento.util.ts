import { Expense } from '../../core/models/expense.model';

export type FormaPagamento =
  | 'PIX'
  | 'CREDITO_1X'
  | 'CREDITO_PARCELADO'
  | 'NAO_IDENTIFICADO';

export const FORMA_PAGAMENTO_LABELS: Record<FormaPagamento, string> = {
  PIX: 'Pix',
  CREDITO_1X: 'Crédito 1x (à vista)',
  CREDITO_PARCELADO: 'Crédito parcelado',
  NAO_IDENTIFICADO: 'Não identificado',
};

export interface ClassificacaoPagamento {
  formaPagamento: FormaPagamento;
  parcelas: number | null;
}

export type DespesaClassificada = Expense & ClassificacaoPagamento;

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
  creditoAvista: FormaPagamentoResumo;
  creditoParcelado: FormaPagamentoResumo;
  naoIdentificado: FormaPagamentoResumo;
  distribuicaoParcelas: ParcelaResumo[];
}

// Uma observação só é considerada "parcelamento no crédito" quando tem AMBOS
// um número seguido de "x" (a contagem de parcelas) E uma palavra de contexto
// de crédito/cartão/parcelamento por perto — evita interpretar um "Nx" solto
// (ex: uma medida "2x3m") como forma de pagamento. Padrões confirmados nos
// dados reais cadastrados: "Pix", "pago pix", "1x no crédito", "10x de
// R$596,11 no crédito", "Parcelado 4x de R$550,09 no cartão", "Parcelado 6x
// de R$889,57", "3x parcelado no crédito", "1x no cartão".
const REGEX_PARCELAS = /(\d+)\s*x\b/i;
const REGEX_CONTEXTO_CREDITO = /(cr[ée]dito|cart[ãa]o|parcelado)/i;
const REGEX_PIX = /\bpix\b/i;

/**
 * Classifica a forma de pagamento de UMA despesa a partir do texto da sua
 * observação — nunca da categoria, valor, data ou descrição. Quando o texto
 * não permite identificar a forma com segurança, retorna NAO_IDENTIFICADO em
 * vez de arriscar um palpite.
 */
export function classificarFormaPagamento(
  observacao: string | null,
): ClassificacaoPagamento {
  const texto = observacao ?? '';

  const matchParcelas = texto.match(REGEX_PARCELAS);
  if (matchParcelas && REGEX_CONTEXTO_CREDITO.test(texto)) {
    const parcelas = Number(matchParcelas[1]);
    return {
      formaPagamento: parcelas <= 1 ? 'CREDITO_1X' : 'CREDITO_PARCELADO',
      parcelas,
    };
  }

  if (REGEX_PIX.test(texto)) {
    return { formaPagamento: 'PIX', parcelas: null };
  }

  return { formaPagamento: 'NAO_IDENTIFICADO', parcelas: null };
}

export function classificarDespesas(despesas: Expense[]): DespesaClassificada[] {
  return despesas.map((despesa) => ({
    ...despesa,
    ...classificarFormaPagamento(despesa.observacao),
  }));
}

export function resumirFormasPagamento(
  despesas: DespesaClassificada[],
): ResumoFormasPagamento {
  const valorTotal = despesas.reduce((soma, despesa) => soma + despesa.valor, 0);

  const resumirGrupo = (forma: FormaPagamento): FormaPagamentoResumo => {
    const doGrupo = despesas.filter((despesa) => despesa.formaPagamento === forma);
    const valor = doGrupo.reduce((soma, despesa) => soma + despesa.valor, 0);
    return {
      quantidade: doGrupo.length,
      valor,
      percentual: valorTotal > 0 ? (valor / valorTotal) * 100 : 0,
    };
  };

  const distribuicaoMap = new Map<number, { quantidade: number; valor: number }>();
  for (const despesa of despesas) {
    if (despesa.parcelas === null) continue;
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
    pix: resumirGrupo('PIX'),
    creditoAvista: resumirGrupo('CREDITO_1X'),
    creditoParcelado: resumirGrupo('CREDITO_PARCELADO'),
    naoIdentificado: resumirGrupo('NAO_IDENTIFICADO'),
    distribuicaoParcelas,
  };
}
