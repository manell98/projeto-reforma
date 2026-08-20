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

export interface Expense {
  id: string;
  valor: number;
  descricao: string;
  categoria: Categoria;
  data: string;
  observacao: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExpensePayload {
  valor: number;
  descricao: string;
  categoria: Categoria;
  data: string;
  observacao?: string | null;
}

export interface ExpenseFilters {
  dataInicio: string | null;
  dataFim: string | null;
  categoria: Categoria | null;
  descricao: string;
}
