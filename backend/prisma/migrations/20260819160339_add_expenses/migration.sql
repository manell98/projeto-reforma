-- CreateEnum
CREATE TYPE "Categoria" AS ENUM ('MATERIAL_CONSTRUCAO', 'MAO_DE_OBRA', 'ELETRICA', 'HIDRAULICA', 'PINTURA', 'PISOS_REVESTIMENTOS', 'MOVEIS', 'FERRAMENTAS', 'TRANSPORTE', 'CHURRASQUEIRA_AREA_GOURMET', 'OUTROS');

-- CreateTable
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL,
    "valor" DECIMAL(12,2) NOT NULL,
    "descricao" TEXT NOT NULL,
    "categoria" "Categoria" NOT NULL,
    "data" DATE NOT NULL,
    "observacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "expenses_data_idx" ON "expenses"("data");

-- CreateIndex
CREATE INDEX "expenses_categoria_idx" ON "expenses"("categoria");
