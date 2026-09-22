-- AlterTable
ALTER TABLE "Ocorrencia" ADD COLUMN     "finalizadoEm" TIMESTAMP(3),
ADD COLUMN     "finalizadoPor" JSONB,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'pendente';
