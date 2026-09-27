-- Evolução da obra: permite reordenar manualmente (arrastar-e-soltar) os
-- registros de um mesmo dia de captura. Migration PURAMENTE ADITIVA — só
-- adiciona uma coluna nullable a uma tabela existente; não altera nenhuma
-- coluna, tipo ou tabela já existente, e não toca em nenhum dado de outras
-- tabelas (expenses/orcamento/obra). Registros existentes ficam com
-- ordem = NULL, ou seja, continuam exibidos exatamente como hoje (ordenados
-- por data/hora de captura) até que o usuário reordene aquele dia pela
-- primeira vez.
-- AlterTable
ALTER TABLE "registros_obra" ADD COLUMN "ordem" INTEGER;
