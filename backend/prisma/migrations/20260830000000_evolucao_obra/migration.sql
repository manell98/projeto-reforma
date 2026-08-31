-- Evolução da obra: registros de foto/vídeo com data de captura separada da
-- data de upload. Migration PURAMENTE ADITIVA — cria dois enums, uma tabela
-- nova e um índice; não altera nenhuma tabela, coluna ou enum existente, e
-- portanto não toca em nenhuma despesa/orçamento/data de obra já cadastrada.
-- CreateEnum
CREATE TYPE "TipoMidia" AS ENUM ('FOTO', 'VIDEO');

-- CreateEnum
CREATE TYPE "OrigemDataCaptura" AS ENUM ('EXIF', 'ARQUIVO', 'MANUAL');

-- CreateTable
CREATE TABLE "registros_obra" (
    "id" TEXT NOT NULL,
    "titulo" TEXT,
    "descricao" TEXT,
    "tipo" "TipoMidia" NOT NULL,
    "arquivoNome" TEXT NOT NULL,
    "arquivoPath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "tamanhoBytes" INTEGER NOT NULL,
    "dataCaptura" DATE NOT NULL,
    "origemDataCaptura" "OrigemDataCaptura" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "registros_obra_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "registros_obra_dataCaptura_idx" ON "registros_obra"("dataCaptura");
