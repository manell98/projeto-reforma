-- Substitui o enum "Categoria" pela nova lista de categorias, migrando as
-- despesas já cadastradas para o valor novo mais próximo (não apaga dados).
CREATE TYPE "Categoria_new" AS ENUM (
  'ELETRODOMESTICOS',
  'MATERIAIS',
  'PEDREIRO',
  'ELETRICISTA',
  'MARCENEIRO',
  'MARMOREIRO',
  'SERRALHEIRO',
  'VIDRACEIRO',
  'LADRILHEIRO',
  'INSTALADOR_PORTA',
  'TIO_NEGUINHO'
);

ALTER TABLE "expenses" ALTER COLUMN "categoria" TYPE "Categoria_new" USING (
  CASE "categoria"::text
    WHEN 'MATERIAL_CONSTRUCAO' THEN 'MATERIAIS'
    WHEN 'MAO_DE_OBRA' THEN 'TIO_NEGUINHO'
    WHEN 'ELETRICA' THEN 'ELETRICISTA'
    WHEN 'HIDRAULICA' THEN 'PEDREIRO'
    WHEN 'PINTURA' THEN 'PEDREIRO'
    WHEN 'PISOS_REVESTIMENTOS' THEN 'LADRILHEIRO'
    WHEN 'MOVEIS' THEN 'MARCENEIRO'
    WHEN 'FERRAMENTAS' THEN 'MATERIAIS'
    WHEN 'TRANSPORTE' THEN 'MATERIAIS'
    WHEN 'CHURRASQUEIRA_AREA_GOURMET' THEN 'PEDREIRO'
    ELSE 'MATERIAIS'
  END
)::"Categoria_new";

ALTER TYPE "Categoria" RENAME TO "Categoria_old";
ALTER TYPE "Categoria_new" RENAME TO "Categoria";
DROP TYPE "Categoria_old";

-- CreateTable
CREATE TABLE "orcamento" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "valor" DECIMAL(12,2) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orcamento_pkey" PRIMARY KEY ("id")
);
