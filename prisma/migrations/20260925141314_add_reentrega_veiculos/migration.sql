-- AlterTable
ALTER TABLE "Ocorrencia" ADD COLUMN     "reentregaStatus" TEXT NOT NULL DEFAULT 'a_definir',
ADD COLUMN     "veiculoReentregaId" TEXT;

-- CreateTable
CREATE TABLE "VeiculoReentrega" (
    "id" TEXT NOT NULL,
    "placa" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VeiculoReentrega_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VeiculoReentrega_placa_key" ON "VeiculoReentrega"("placa");

-- CreateIndex
CREATE INDEX "Ocorrencia_veiculoReentregaId_idx" ON "Ocorrencia"("veiculoReentregaId");

-- AddForeignKey
ALTER TABLE "Ocorrencia" ADD CONSTRAINT "Ocorrencia_veiculoReentregaId_fkey" FOREIGN KEY ("veiculoReentregaId") REFERENCES "VeiculoReentrega"("id") ON DELETE SET NULL ON UPDATE CASCADE;
