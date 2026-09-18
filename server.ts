import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import * as XLSX from "xlsx";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import fastifyJwt from "@fastify/jwt";

const prisma = new PrismaClient();
const app = Fastify({ logger: true });

// ==========================================
// ROTA DE HEALTH CHECK
// ==========================================
app.get("/api/health", async (_request, reply) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return {
      status: "ok",
      database: "Conectado ao Neon com sucesso!",
    };
  } catch (error) {
    app.log.error(error);

    return reply.status(503).send({
      status: "error",
      message: "Erro ao conectar no banco de dados.",
    });
  }
});

// ==========================================
// ROTAS DE AUTENTICAÇÃO E USUÁRIOS
// ==========================================

app.post("/api/login", async (request, reply) => {
  try {
    const body = request.body as any;

    if (!body.email || !body.password) {
      return reply
        .status(400)
        .send({ error: "E-mail e senha são obrigatórios." });
    }

    const emailNormalizado = String(body.email).trim().toLowerCase();

    // Busca o usuário pelo e-mail
    const user = await prisma.user.findUnique({
      where: { email: emailNormalizado },
    });

    if (!user) {
      return reply.status(401).send({ error: "E-mail ou senha inválidos." });
    }

    // Compara a senha enviada com o hash salvo no banco
    const senhaValida = await bcrypt.compare(body.password, user.passwordHash);

    if (!senhaValida) {
      return reply.status(401).send({ error: "E-mail ou senha inválidos." });
    }

    // 🔑 Gerando o Token JWT
    const token = app.jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      { expiresIn: "7d" },
    );

    // Login bem-sucedido (retorna o token e os dados do usuário sem a senha)
    return {
      success: true,
      message: "Login realizado com sucesso!",
      token,
      user: {
        id: user.id,
        name: user.name,
        cargo: user.cargo,
        email: user.email,
      },
    };
  } catch (error) {
    app.log.error(error);
    return reply.status(500).send({ error: "Erro ao realizar login." });
  }
});

app.get("/api/users", async (request, reply) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        cargo: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return { total: users.length, users };
  } catch (error) {
    app.log.error(error);
    return reply.status(500).send({ error: "Erro ao listar usuários." });
  }
});

app.get("/api/users/:id", async (request, reply) => {
  try {
    const { id } = request.params as { id: string };

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        cargo: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return reply.status(404).send({ error: "Usuário não encontrado." });
    }

    return { user };
  } catch (error) {
    app.log.error(error);
    return reply.status(500).send({ error: "Erro ao buscar usuário." });
  }
});

app.post("/api/users", async (request, reply) => {
  try {
    const body = request.body as any;

    if (!body.name || !body.cargo || !body.email || !body.password) {
      return reply.status(400).send({
        error:
          "Nome, cargo, e-mail e senha são obrigatórios para criar um usuário.",
      });
    }

    const emailNormalizado = String(body.email).trim().toLowerCase();

    const userExistente = await prisma.user.findUnique({
      where: { email: emailNormalizado },
    });

    if (userExistente) {
      return reply
        .status(400)
        .send({ error: "Este e-mail já está cadastrado no sistema." });
    }

    const passwordHash = await bcrypt.hash(body.password, 10);

    const novoUser = await prisma.user.create({
      data: {
        name: String(body.name).trim(),
        cargo: String(body.cargo).trim(),
        email: emailNormalizado,
        passwordHash,
      },
      select: {
        id: true,
        name: true,
        cargo: true,
        email: true,
        createdAt: true,
      },
    });

    return reply.status(201).send({
      success: true,
      message: "Usuário criado com sucesso!",
      user: novoUser,
    });
  } catch (error) {
    app.log.error(error);
    return reply.status(500).send({ error: "Erro ao criar usuário." });
  }
});

app.put("/api/users/:id", async (request, reply) => {
  try {
    const { id } = request.params as { id: string };
    const body = request.body as any;

    const dataToUpdate: any = {};
    if (body.name) dataToUpdate.name = String(body.name).trim();
    if (body.cargo) dataToUpdate.cargo = String(body.cargo).trim();
    if (body.email)
      dataToUpdate.email = String(body.email).trim().toLowerCase();

    if (body.password) {
      dataToUpdate.passwordHash = await bcrypt.hash(body.password, 10);
    }

    const userAtualizado = await prisma.user.update({
      where: { id },
      data: dataToUpdate,
      select: {
        id: true,
        name: true,
        cargo: true,
        email: true,
        updatedAt: true,
      },
    });

    return {
      success: true,
      message: "Usuário atualizado com sucesso!",
      user: userAtualizado,
    };
  } catch (error) {
    app.log.error(error);
    return reply
      .status(500)
      .send({ error: "Erro ao atualizar usuário (ID pode não existir)." });
  }
});

app.delete("/api/users/:id", async (request, reply) => {
  try {
    const { id } = request.params as { id: string };

    await prisma.user.delete({
      where: { id },
    });

    return {
      success: true,
      message: "Usuário deletado com sucesso!",
    };
  } catch (error) {
    app.log.error(error);
    return reply
      .status(500)
      .send({ error: "Erro ao deletar usuário (ID pode não existir)." });
  }
});

// ==========================================
// ROTAS DE NOTAS FISCAIS
// ==========================================

app.get("/api/notas", async (request, reply) => {
  try {
    const notas = await prisma.nota.findMany({
      include: { itens: true },
      orderBy: { importadoEm: "desc" },
      take: 50,
    });
    return { total: notas.length, notas };
  } catch (error) {
    app.log.error(error);
    return reply.status(500).send({ error: "Erro ao buscar notas fiscais." });
  }
});

app.post("/api/notas", async (request, reply) => {
  try {
    const body = request.body as any;

    if (!body.numeroNf) {
      return reply
        .status(400)
        .send({ error: "O número da Nota Fiscal é obrigatório." });
    }

    const numeroNormalizado = String(body.numeroNf).trim();

    const notaSalva = await prisma.nota.upsert({
      where: { numeroNf: numeroNormalizado },
      update: {
        placa: body.placa,
        peso: body.peso,
        valor: body.valor,
        cliente: body.cliente,
        motorista: body.motorista,
        cidade: body.cidade,
      },
      create: {
        numeroNf: numeroNormalizado,
        numeroNfOriginal: body.numeroNfOriginal || body.numeroNf,
        placa: body.placa,
        placaOriginal: body.placaOriginal,
        peso: body.peso || 0,
        pesoLiquido: body.pesoLiquido || 0,
        valor: body.valor || 0,
        vendedor: body.vendedor,
        cliente: body.cliente,
        codigoCliente: body.codigoCliente,
        cidade: body.cidade,
        bairro: body.bairro,
        endereco: body.endereco,
        motorista: body.motorista,
        descricao: body.descricao,
        unidade: body.unidade || "kg",
        lote: body.lote,
        qtdItens: body.itens?.length || 0,
        itens: {
          create: (body.itens || []).map((item: any) => ({
            codigo: item.codigo,
            descricao: item.descricao,
            pesoLiquido: item.pesoLiquido || 0,
            quantidade: item.quantidade || 0,
            valorUnitario: item.valorUnitario || 0,
            valorTotal: item.valorTotal || 0,
          })),
        },
      },
      include: { itens: true },
    });

    return {
      success: true,
      message: "Nota fiscal salva com sucesso!",
      nota: notaSalva,
    };
  } catch (error) {
    app.log.error(error);
    return reply
      .status(500)
      .send({ error: "Erro ao processar a importação da nota fiscal." });
  }
});

app.post("/api/importar-planilha", async (request, reply) => {
  try {
    const data = await request.file();

    if (!data) {
      return reply.status(400).send({ error: "Nenhum arquivo enviado." });
    }

    const buffer = await data.toBuffer();
    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
    const sheetName = workbook.SheetNames[0];

    if (!sheetName) {
      return reply
        .status(400)
        .send({ error: "Nenhuma aba encontrada na planilha." });
    }

    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: "",
      raw: true,
    });

    if (rows.length === 0) {
      return reply.status(400).send({
        error: "A planilha está vazia ou em um formato inválido.",
      });
    }

    const texto = (value: unknown): string => {
      if (value === null || value === undefined) return "";
      return String(value).trim();
    };

    const numero = (value: unknown): number => {
      if (value === null || value === undefined || value === "") return 0;
      if (typeof value === "number") return Number.isFinite(value) ? value : 0;

      const valor = String(value).trim();
      if (!valor) return 0;

      const normalizado = valor.includes(",")
        ? valor.replace(/\./g, "").replace(",", ".")
        : valor;

      const resultado = Number(normalizado);
      return Number.isFinite(resultado) ? resultado : 0;
    };

    // Cada linha da planilha representa um item da NF.
    // Agrupamos primeiro para não sobrescrever os itens anteriores.
    const notasAgrupadas = new Map<string, Record<string, unknown>[]>();

    for (const row of rows) {
      const numeroNf = texto(row["Número NF"]);
      if (!numeroNf) continue;

      const grupo = notasAgrupadas.get(numeroNf) || [];
      grupo.push(row);
      notasAgrupadas.set(numeroNf, grupo);
    }

    if (notasAgrupadas.size === 0) {
      return reply.status(400).send({
        error:
          'Não foi encontrada nenhuma coluna "Número NF" com dados válidos.',
      });
    }

    let totalItensImportados = 0;

    for (const [numeroNf, linhas] of notasAgrupadas) {
      const primeiraLinha = linhas[0];

      const itens = linhas.map((row) => ({
        codigo: texto(row["Código item"]),
        descricao: texto(row["Descrição item"]),
        pesoLiquido: numero(row["Peso total liquido"]),
        // A planilha não possui coluna de quantidade.
        quantidade: 1,
        valorUnitario: numero(row["Valor unitário do item"]),
        // A planilha não possui valor total do item.
        valorTotal: 0,
      }));

      totalItensImportados += itens.length;

      await prisma.nota.upsert({
        where: { numeroNf },
        update: {
          numeroNfOriginal: numeroNf,
          placa: texto(primeiraLinha["Placa"]),
          cliente: texto(primeiraLinha["Cliente"]),
          peso: numero(primeiraLinha["Peso"]),
          pesoLiquido: numero(primeiraLinha["Peso total liquido"]),
          vendedor: texto(primeiraLinha["Vendedor"]),
          codigoCliente: texto(primeiraLinha["Código cliente"]),
          cidade: texto(primeiraLinha["Cidade"]),
          bairro: texto(primeiraLinha["Bairro"]),
          endereco: texto(primeiraLinha["Endereço"]),
          motorista: texto(primeiraLinha["Motorista"]),
          unidade: texto(primeiraLinha["Unidade"]) || "kg",
          descricao: texto(primeiraLinha["Descrição"]),
          qtdItens: itens.length,
          itens: {
            deleteMany: {},
            create: itens,
          },
        },
        create: {
          numeroNf,
          numeroNfOriginal: numeroNf,
          placa: texto(primeiraLinha["Placa"]),
          cliente: texto(primeiraLinha["Cliente"]),
          peso: numero(primeiraLinha["Peso"]),
          pesoLiquido: numero(primeiraLinha["Peso total liquido"]),
          valor: 0,
          vendedor: texto(primeiraLinha["Vendedor"]),
          codigoCliente: texto(primeiraLinha["Código cliente"]),
          cidade: texto(primeiraLinha["Cidade"]),
          bairro: texto(primeiraLinha["Bairro"]),
          endereco: texto(primeiraLinha["Endereço"]),
          motorista: texto(primeiraLinha["Motorista"]),
          unidade: texto(primeiraLinha["Unidade"]) || "kg",
          descricao: texto(primeiraLinha["Descrição"]),
          qtdItens: itens.length,
          itens: { create: itens },
        },
      });
    }

    return {
      success: true,
      message: `Planilha importada com sucesso! ${notasAgrupadas.size} notas e ${totalItensImportados} itens processados.`,
      totalImportadas: notasAgrupadas.size,
      totalItens: totalItensImportados,
    };
  } catch (error) {
    app.log.error(error);
    return reply.status(500).send({
      error: "Erro ao processar e salvar a planilha.",
    });
  }
});

// ==========================================
// ROTAS DE OCORRÊNCIAS
// ==========================================

app.get("/api/ocorrencias", async (request, reply) => {
  try {
    const ocorrencias = await prisma.ocorrencia.findMany({
      orderBy: { criadoEm: "desc" },
      take: 50,
    });
    return { total: ocorrencias.length, ocorrencias };
  } catch (error) {
    app.log.error(error);
    return reply.status(500).send({ error: "Erro ao buscar ocorrências." });
  }
});

app.post("/api/ocorrencias", async (request, reply) => {
  try {
    const body = request.body as any;

    if (!body.numeroNf || !body.motivo) {
      return reply.status(400).send({
        error:
          "O número da Nota Fiscal (numeroNf) e o motivo da ocorrência são obrigatórios.",
      });
    }

    const numeroNfNormalizado = String(body.numeroNf).trim();

    const nota = await prisma.nota.findUnique({
      where: { numeroNf: numeroNfNormalizado },
      include: { itens: true },
    });

    if (!nota) {
      return reply.status(404).send({
        error:
          "Nota Fiscal não encontrada no sistema. Importe a nota antes de lançar a ocorrência.",
      });
    }

    const dataRefAtual = new Date().toISOString().split("T")[0];

    const novaOcorrencia = await prisma.ocorrencia.create({
      data: {
        numeroNf: nota.numeroNf,
        numeroNfOriginal: nota.numeroNfOriginal,
        placa: nota.placa,
        cliente: nota.cliente,
        vendedor: nota.vendedor,
        motorista: nota.motorista,
        cidade: nota.cidade,
        motivo: body.motivo,
        observacao: body.observacao,
        unidade: nota.unidade,
        itens: body.itens || nota.itens,
        totalQtd: body.totalQtd || 0,
        totalPeso: body.totalPeso || 0,
        totalValor: body.totalValor || 0,
        valorNota: nota.valor || 0,
        pesoNota: nota.peso || 0,
        para: body.para,
        cc: body.cc,
        criadoPor: body.criadoPor || {
          nome: "Sistema",
          email: "admin@sistema.com",
        },
        criadoPorEmail: body.criadoPorEmail || "admin@sistema.com",
        dataRef: body.dataRef || dataRefAtual,
      },
    });

    return {
      success: true,
      message: "Ocorrência registrada com sucesso!",
      ocorrencia: novaOcorrencia,
    };
  } catch (error) {
    app.log.error(error);
    return reply.status(500).send({ error: "Erro ao registrar a ocorrência." });
  }
});

// ==========================================
// ROTAS DE RETENÇÕES
// ==========================================

app.get("/api/retencoes", async (request, reply) => {
  try {
    const retencoes = await prisma.retencao.findMany({
      orderBy: { criadoEm: "desc" },
      take: 50,
    });
    return { total: retencoes.length, retencoes };
  } catch (error) {
    app.log.error(error);
    return reply.status(500).send({ error: "Erro ao buscar retenções." });
  }
});

app.post("/api/retencoes", async (request, reply) => {
  try {
    const body = request.body as any;

    if (
      !body.placa ||
      !body.nfs ||
      !Array.isArray(body.nfs) ||
      body.nfs.length === 0
    ) {
      return reply.status(400).send({
        error:
          "A placa e um array com as notas fiscais (nfs) são obrigatórios para registrar uma retenção.",
      });
    }

    const placaNormalizada = String(body.placa).trim().toUpperCase();
    const dataRefAtual = new Date().toISOString().split("T")[0];

    const novaRetencao = await prisma.retencao.create({
      data: {
        placa: placaNormalizada,
        placaOriginal: body.placaOriginal || body.placa,
        nfOrigem: body.nfOrigem || body.nfs[0]?.numeroNf || "GERAL",
        nfs: body.nfs,
        quantidadeNfs: body.nfs.length,
        totalValor: body.totalValor || 0,
        totalPeso: body.totalPeso || 0,
        totalItens: body.totalItens || 0,
        motoristas: body.motoristas || [],
        vendedores: body.vendedores || [],
        motivo: body.motivo,
        para: body.para,
        cc: body.cc,
        criadoPor: body.criadoPor || {
          nome: "Sistema",
          email: "admin@sistema.com",
        },
        criadoPorEmail: body.criadoPorEmail || "admin@sistema.com",
        dataRef: body.dataRef || dataRefAtual,
      },
    });

    return {
      success: true,
      message: "Retenção consolidada e salva com sucesso!",
      retencao: novaRetencao,
    };
  } catch (error) {
    app.log.error(error);
    return reply.status(500).send({ error: "Erro ao registrar a retenção." });
  }
});

// ==========================================
// INICIALIZAÇÃO DO SERVIDOR
// ==========================================
const start = async () => {
  try {
    // Registrar Plugins do Fastify
    await app.register(cors, { origin: true });
    await app.register(multipart, {
      limits: { fileSize: 10 * 1024 * 1024 }, // Limite de 10MB por arquivo
    });
    // Registrar o Plugin do JWT
    await app.register(fastifyJwt, {
      secret: process.env.JWT_SECRET || "sua-chave-secreta-super-segura-jbs",
    });

    const port = Number(process.env.PORT) || 3001;
    await app.listen({ port, host: "0.0.0.0" });
    console.log(`🚀 Servidor Fastify rodando na porta ${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
