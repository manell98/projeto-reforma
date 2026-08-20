export type OrcamentoTipo =
  | 'GERAL'
  | 'PEDREIRO'
  | 'ELETRICISTA'
  | 'TIO_NEGUINHO'
  | 'MARCENEIRO'
  | 'MARMOREIRO';

// Tipos de orçamento que têm um limite específico dentro do orçamento geral.
// Os gastos de cada um vêm das próprias despesas (categoria === tipo) — não
// existe cadastro de gasto separado.
export type TipoOrcamentoEspecifico =
  | 'PEDREIRO'
  | 'ELETRICISTA'
  | 'TIO_NEGUINHO'
  | 'MARCENEIRO'
  | 'MARMOREIRO';

export interface Orcamento {
  tipo: OrcamentoTipo;
  valor: number;
}
