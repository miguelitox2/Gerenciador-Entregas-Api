-- CreateTable
CREATE TABLE "ComentarioOcorrencia" (
    "id" TEXT NOT NULL,
    "ocorrenciaId" TEXT NOT NULL,
    "comentario" TEXT NOT NULL,
    "criadoPor" TEXT NOT NULL,
    "criadoPorEmail" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComentarioOcorrencia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ComentarioOcorrencia_ocorrenciaId_idx" ON "ComentarioOcorrencia"("ocorrenciaId");

-- AddForeignKey
ALTER TABLE "ComentarioOcorrencia" ADD CONSTRAINT "ComentarioOcorrencia_ocorrenciaId_fkey" FOREIGN KEY ("ocorrenciaId") REFERENCES "Ocorrencia"("id") ON DELETE CASCADE ON UPDATE CASCADE;
