-- Forma de pagamento estruturada da despesa (aditivo, não altera nenhuma
-- despesa existente — as 49 linhas reais atuais ficam com formaPagamento e
-- parcelas em NULL, exibidas como "não informado" pelo frontend).
-- CreateEnum
CREATE TYPE "FormaPagamento" AS ENUM ('PIX', 'CARTAO_CREDITO');

-- AlterTable
ALTER TABLE "expenses" ADD COLUMN "formaPagamento" "FormaPagamento",
ADD COLUMN "parcelas" INTEGER;
