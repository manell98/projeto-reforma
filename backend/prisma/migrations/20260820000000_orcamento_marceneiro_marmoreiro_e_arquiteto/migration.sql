-- Adiciona Marceneiro e Marmoreiro como orçamentos específicos (aditivo).
-- MARCENEIRO e MARMOREIRO já existem em "Categoria" desde a migration
-- 20260819183501_categorias_e_orcamento — aqui só ganham um teto de
-- orçamento próprio, reutilizando exatamente a mesma tabela "orcamento".
ALTER TYPE "OrcamentoTipo" ADD VALUE 'MARCENEIRO';
ALTER TYPE "OrcamentoTipo" ADD VALUE 'MARMOREIRO';

-- Nova categoria de despesa (aditiva, sem orçamento específico associado).
ALTER TYPE "Categoria" ADD VALUE 'ARQUITETO';
