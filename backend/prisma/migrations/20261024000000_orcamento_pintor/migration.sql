-- Adiciona Pintor como categoria de despesa e como orçamento específico
-- (puramente aditivo: só acrescenta valores de enum, nenhuma linha existente
-- é lida, alterada ou removida). Segue o mesmo padrão da migration
-- 20260820000000_orcamento_marceneiro_marmoreiro_e_arquiteto.
ALTER TYPE "Categoria" ADD VALUE 'PINTOR';
ALTER TYPE "OrcamentoTipo" ADD VALUE 'PINTOR';
