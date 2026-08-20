-- Adiciona o Eletricista como terceiro orçamento específico (aditivo).
ALTER TYPE "OrcamentoTipo" ADD VALUE 'ELETRICISTA';

-- Elimina o CRUD próprio de "gastos_orcamento": os gastos do Pedreiro,
-- Eletricista e Tio Neguinho passam a vir exclusivamente das despesas gerais
-- (Expense) cuja categoria bate com o tipo do orçamento específico. Antes de
-- derrubar a tabela, migra qualquer lançamento já existente para "expenses"
-- com a categoria correspondente, para não perder nenhum gasto real.
INSERT INTO "expenses" ("id", "valor", "descricao", "categoria", "data", "observacao", "createdAt", "updatedAt")
SELECT gen_random_uuid(), "valor", "descricao", "tipo"::text::"Categoria", "data", NULLIF("observacao", ''), "createdAt", "updatedAt"
FROM "gastos_orcamento";

DROP TABLE "gastos_orcamento";
DROP TYPE "TipoGastoEspecifico";
