export type Categoria =
  | 'ELETRODOMESTICOS'
  | 'MATERIAIS'
  | 'PEDREIRO'
  | 'ELETRICISTA'
  | 'MARCENEIRO'
  | 'MARMOREIRO'
  | 'SERRALHEIRO'
  | 'VIDRACEIRO'
  | 'LADRILHEIRO'
  | 'INSTALADOR_PORTA'
  | 'TIO_NEGUINHO'
  | 'ALUGUEL_MATERIAIS'
  | 'REMOCAO_ENTULHO'
  | 'ARQUITETO'
  | 'OUTROS';

export interface CategoriaOption {
  valor: Categoria;
  label: string;
}

// Forma de pagamento estruturada da despesa. `null` significa "não
// informado" — despesas cadastradas antes desse campo existir, nunca
// deduzido a partir da observação (texto livre).
export type FormaPagamento = 'PIX' | 'CARTAO_CREDITO';

export interface Expense {
  id: string;
  valor: number;
  descricao: string;
  categoria: Categoria;
  data: string;
  observacao: string | null;
  formaPagamento: FormaPagamento | null;
  parcelas: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExpensePayload {
  valor: number;
  descricao: string;
  categoria: Categoria;
  data: string;
  observacao?: string | null;
  formaPagamento: FormaPagamento;
  parcelas: number | null;
}

export interface ExpenseFilters {
  dataInicio: string | null;
  dataFim: string | null;
  categoria: Categoria | null;
  descricao: string;
}
