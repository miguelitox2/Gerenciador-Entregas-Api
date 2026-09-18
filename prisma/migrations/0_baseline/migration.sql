-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cargo" TEXT NOT NULL DEFAULT 'N├úo informado',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Nota" (
    "numeroNf" TEXT NOT NULL,
    "numeroNfOriginal" TEXT NOT NULL,
    "placa" TEXT,
    "placaOriginal" TEXT,
    "peso" DOUBLE PRECISION,
    "pesoLiquido" DOUBLE PRECISION,
    "valor" DOUBLE PRECISION,
    "vendedor" TEXT,
    "cliente" TEXT,
    "codigoCliente" TEXT,
    "cidade" TEXT,
    "bairro" TEXT,
    "endereco" TEXT,
    "motorista" TEXT,
    "descricao" TEXT,
    "emailVendedor" TEXT,
    "emailLogistica" TEXT,
    "unidade" TEXT NOT NULL DEFAULT 'kg',
    "lote" TEXT,
    "importadoPor" JSONB,
    "importadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "qtdItens" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Nota_pkey" PRIMARY KEY ("numeroNf")
);

-- CreateTable
CREATE TABLE "ItemNota" (
    "id" TEXT NOT NULL,
    "notaNumeroNf" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "pesoLiquido" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "quantidade" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "valorUnitario" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "valorTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "ItemNota_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ocorrencia" (
    "id" TEXT NOT NULL,
    "numeroNf" TEXT NOT NULL,
    "numeroNfOriginal" TEXT NOT NULL,
    "placa" TEXT,
    "cliente" TEXT,
    "vendedor" TEXT,
    "motorista" TEXT,
    "cidade" TEXT,
    "motivo" TEXT NOT NULL,
    "observacao" TEXT,
    "unidade" TEXT NOT NULL DEFAULT 'kg',
    "itens" JSONB,
    "totalQtd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalPeso" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalValor" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "valorNota" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pesoNota" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "para" TEXT,
    "cc" TEXT,
    "criadoPor" JSONB,
    "criadoPorEmail" TEXT NOT NULL,
    "dataRef" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ocorrencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Retencao" (
    "id" TEXT NOT NULL,
    "placa" TEXT NOT NULL,
    "placaOriginal" TEXT NOT NULL,
    "nfOrigem" TEXT NOT NULL,
    "nfs" JSONB NOT NULL,
    "quantidadeNfs" INTEGER NOT NULL DEFAULT 0,
    "totalValor" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalPeso" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalItens" INTEGER NOT NULL DEFAULT 0,
    "motoristas" JSONB NOT NULL,
    "vendedores" JSONB NOT NULL,
    "motivo" TEXT,
    "para" TEXT,
    "cc" TEXT,
    "criadoPor" JSONB,
    "criadoPorEmail" TEXT NOT NULL,
    "dataRef" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Retencao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "ItemNota" ADD CONSTRAINT "ItemNota_notaNumeroNf_fkey" FOREIGN KEY ("notaNumeroNf") REFERENCES "Nota"("numeroNf") ON DELETE CASCADE ON UPDATE CASCADE;

