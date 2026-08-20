-- Adiciona as novas categorias de despesa (aditivo, não remove nenhuma existente)
ALTER TYPE "Categoria" ADD VALUE 'ALUGUEL_MATERIAIS';
ALTER TYPE "Categoria" ADD VALUE 'REMOCAO_ENTULHO';
ALTER TYPE "Categoria" ADD VALUE 'OUTROS';

-- CreateEnum
CREATE TYPE "OrcamentoTipo" AS ENUM ('GERAL', 'PEDREIRO', 'TIO_NEGUINHO');

-- Transforma a tabela "orcamento" de uma linha única (id fixo = 1) para até
-- três linhas identificadas por "tipo" (GERAL, PEDREIRO, TIO_NEGUINHO).
-- O valor já cadastrado (id = 1) vira o orçamento GERAL — não é descartado.
ALTER TABLE "orcamento" ADD COLUMN "tipo" "OrcamentoTipo";
UPDATE "orcamento" SET "tipo" = 'GERAL' WHERE "id" = 1;
ALTER TABLE "orcamento" DROP CONSTRAINT "orcamento_pkey";
ALTER TABLE "orcamento" ALTER COLUMN "tipo" SET NOT NULL;
ALTER TABLE "orcamento" ADD CONSTRAINT "orcamento_pkey" PRIMARY KEY ("tipo");
ALTER TABLE "orcamento" DROP COLUMN "id";

-- CreateEnum
CREATE TYPE "TipoGastoEspecifico" AS ENUM ('PEDREIRO', 'TIO_NEGUINHO');

-- CreateTable
CREATE TABLE "gastos_orcamento" (
    "id" TEXT NOT NULL,
    "tipo" "TipoGastoEspecifico" NOT NULL,
    "valor" DECIMAL(12,2) NOT NULL,
    "descricao" TEXT NOT NULL,
    "data" DATE NOT NULL,
    "observacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gastos_orcamento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "gastos_orcamento_tipo_idx" ON "gastos_orcamento"("tipo");

-- CreateTable
CREATE TABLE "obra" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "dataInicio" DATE,
    "dataTermino" DATE,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "obra_pkey" PRIMARY KEY ("id")
);
