-- AlterTable
ALTER TABLE "User" ALTER COLUMN "cargo" SET DEFAULT 'Não informado';

-- CreateTable
CREATE TABLE "Importacao" (
    "id" TEXT NOT NULL,
    "arquivo" TEXT NOT NULL,
    "importadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "volume" INTEGER NOT NULL DEFAULT 0,
    "totalLinhas" INTEGER NOT NULL DEFAULT 0,
    "responsavel" TEXT NOT NULL,
    "responsavelEmail" TEXT,
    "status" TEXT NOT NULL,
    "erros" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Importacao_pkey" PRIMARY KEY ("id")
);
