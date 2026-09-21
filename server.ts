import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import * as XLSX from "xlsx";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import fastifyJwt from "@fastify/jwt";
import {
  enviarEmailOcorrencia,
  enviarEmailTeste,
  enviarEmailTesteTemplate,
} from "./api/services/ocorrenciaEmail";

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

app.get("/api/notas/:numeroNf", async (request, reply) => {
  try {
    const { numeroNf } = request.params as { numeroNf: string };
    const numeroNormalizado = String(numeroNf).trim();

    const nota = await prisma.nota.findUnique({
      where: { numeroNf: numeroNormalizado },
      include: { itens: true },
    });

    if (!nota) {
      return reply.status(404).send({
        error: "Nota Fiscal não encontrada no sistema.",
      });
    }

    return { nota };
  } catch (error) {
    app.log.error(error);
    return reply.status(500).send({
      error: "Erro ao buscar a Nota Fiscal.",
    });
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
  let importacaoId: string | null = null;

  try {
    const data = await request.file();

    if (!data) {
      return reply.status(400).send({ error: "Nenhum arquivo enviado." });
    }

    const responsavel = String(
      request.headers["x-responsavel"] || "Usuário do sistema",
    ).trim();

    const responsavelEmail = String(
      request.headers["x-responsavel-email"] || "",
    ).trim();

    const arquivo = data.filename || "arquivo-sem-nome";

    const importacao = await prisma.importacao.create({
      data: {
        arquivo,
        responsavel,
        responsavelEmail: responsavelEmail || null,
        status: "Processando",
        volume: 0,
        totalLinhas: 0,
        erros: 0,
      },
    });

    importacaoId = importacao.id;

    const buffer = await data.toBuffer();

    const texto = (value: unknown): string => {
      if (value === null || value === undefined) return "";
      return String(value).trim();
    };

    const numero = (value: unknown): number => {
      if (value === null || value === undefined || value === "") return 0;

      if (typeof value === "number") {
        return Number.isFinite(value) ? value : 0;
      }

      const valor = String(value).trim();
      if (!valor) return 0;

      const normalizado = valor.includes(",")
        ? valor.replace(/\./g, "").replace(",", ".")
        : valor;

      const resultado = Number(normalizado);
      return Number.isFinite(resultado) ? resultado : 0;
    };

    const decodificarHtml = (value: string): string => {
      return value
        .replace(/<br\s*\/?>/gi, " ")
        .replace(/<[^>]*>/g, "")
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .replace(/&#(\d+);/g, (_match, code) =>
          String.fromCharCode(Number(code)),
        )
        .replace(/&#x([0-9a-f]+);/gi, (_match, code) =>
          String.fromCharCode(parseInt(code, 16)),
        )
        .trim();
    };

    const normalizarCabecalho = (value: string): string => {
      return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
    };

    const extrairLinhasHtml = (html: string): Record<string, unknown>[] => {
      const trs = [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)];

      if (trs.length === 0) return [];

      const linhas = trs.map((match) => {
        const celulas = [
          ...match[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi),
        ];

        return celulas.map((cell) => decodificarHtml(cell[1]));
      });

      const indiceCabecalho = linhas.findIndex(
        (linha) =>
          linha.length > 0 &&
          linha.some(
            (celula) =>
              normalizarCabecalho(celula) === "numeronf" ||
              (normalizarCabecalho(celula).includes("numero") &&
                normalizarCabecalho(celula).includes("nf")),
          ),
      );

      if (indiceCabecalho === -1) return [];

      const cabecalhos = linhas[indiceCabecalho];

      return linhas
        .slice(indiceCabecalho + 1)
        .filter((linha) => linha.some((celula) => celula !== ""))
        .map((linha) => {
          const objeto: Record<string, unknown> = {};

          cabecalhos.forEach((cabecalho, index) => {
            if (cabecalho) objeto[cabecalho] = linha[index] ?? "";
          });

          return objeto;
        });
    };

    let rows: Record<string, unknown>[] = [];

    const inicioArquivo = buffer
      .subarray(0, Math.min(buffer.length, 2000))
      .toString("latin1");

    if (/<table\b/i.test(inicioArquivo)) {
      rows = extrairLinhasHtml(buffer.toString("latin1"));
    } else {
      const workbook = XLSX.read(buffer, {
        type: "buffer",
        cellDates: true,
      });

      const sheetName = workbook.SheetNames[0];

      if (!sheetName) {
        throw new Error("Nenhuma aba encontrada na planilha.");
      }

      const sheet = workbook.Sheets[sheetName];

      rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        defval: "",
        raw: true,
      });
    }

    if (rows.length === 0) {
      throw new Error("A planilha está vazia ou em um formato inválido.");
    }

    await prisma.importacao.update({
      where: { id: importacaoId },
      data: { totalLinhas: rows.length },
    });

    const primeiraLinha = rows[0];

    const chaveNumeroNf = Object.keys(primeiraLinha).find((chave) => {
      const normalizada = normalizarCabecalho(chave);

      return (
        normalizada === "numeronf" ||
        (normalizada.includes("numero") && normalizada.includes("nf"))
      );
    });

    if (!chaveNumeroNf) {
      throw new Error(
        'Não foi encontrada nenhuma coluna de número da NF na planilha. Verifique se o arquivo possui a coluna "Número NF".',
      );
    }

    const notasAgrupadas = new Map<string, Record<string, unknown>[]>();

    for (const row of rows) {
      const numeroNf = texto(row[chaveNumeroNf]);

      if (!numeroNf) continue;

      const grupo = notasAgrupadas.get(numeroNf) || [];
      grupo.push(row);
      notasAgrupadas.set(numeroNf, grupo);
    }

    if (notasAgrupadas.size === 0) {
      throw new Error(
        "A coluna de número da NF foi encontrada, mas não possui dados válidos.",
      );
    }

    const coluna = (row: Record<string, unknown>, nome: string) => {
      const chave = Object.keys(row).find(
        (key) => normalizarCabecalho(key) === normalizarCabecalho(nome),
      );

      return chave ? row[chave] : "";
    };

    const operacoes = Array.from(notasAgrupadas.entries()).map(
      ([numeroNf, linhas]) => {
        const primeiraLinha = linhas[0];

        const itens = linhas.map((row) => ({
          codigo: texto(coluna(row, "Código item")),
          descricao: texto(coluna(row, "Descrição item")),
          pesoLiquido: numero(coluna(row, "Peso total liquido")),
          quantidade: 1,
          valorUnitario: numero(coluna(row, "Valor unitário do item")),
          valorTotal: 0,
        }));

        const dadosNota = {
          numeroNfOriginal: numeroNf,
          importadoPor: {
            nome: responsavel,
            email: responsavelEmail,
          },
          importadoEm: new Date(),
          placa: texto(coluna(primeiraLinha, "Placa")),
          cliente: texto(coluna(primeiraLinha, "Cliente")),
          peso: numero(coluna(primeiraLinha, "Peso")),
          pesoLiquido: numero(coluna(primeiraLinha, "Peso total liquido")),
          vendedor: texto(coluna(primeiraLinha, "Vendedor")),
          codigoCliente: texto(coluna(primeiraLinha, "Código cliente")),
          cidade: texto(coluna(primeiraLinha, "Cidade")),
          bairro: texto(coluna(primeiraLinha, "Bairro")),
          endereco: texto(coluna(primeiraLinha, "Endereço")),
          motorista: texto(coluna(primeiraLinha, "Motorista")),
          unidade: texto(coluna(primeiraLinha, "Unidade")) || "kg",
          descricao: texto(coluna(primeiraLinha, "Descrição")),
          qtdItens: itens.length,
        };

        return { numeroNf, dadosNota, itens };
      },
    );

    const TAMANHO_LOTE = 10;

    for (let inicio = 0; inicio < operacoes.length; inicio += TAMANHO_LOTE) {
      const lote = operacoes.slice(inicio, inicio + TAMANHO_LOTE);

      await Promise.all(
        lote.map(async ({ numeroNf, dadosNota, itens }) => {
          await prisma.nota.upsert({
            where: { numeroNf },
            update: {
              ...dadosNota,
              itens: {
                deleteMany: {},
                create: itens,
              },
            },
            create: {
              numeroNf,
              ...dadosNota,
              valor: 0,
              itens: { create: itens },
            },
          });
        }),
      );
    }

    const totalItensImportados = operacoes.reduce(
      (total, operacao) => total + operacao.itens.length,
      0,
    );

    await prisma.importacao.update({
      where: { id: importacaoId },
      data: {
        volume: notasAgrupadas.size,
        totalLinhas: rows.length,
        status: "Sucesso",
        erros: 0,
      },
    });

    return {
      success: true,
      message: `Planilha importada com sucesso! ${notasAgrupadas.size} notas e ${totalItensImportados} itens processados.`,
      totalImportadas: notasAgrupadas.size,
      totalItens: totalItensImportados,
    };
  } catch (error) {
    app.log.error(error);

    if (importacaoId) {
      try {
        await prisma.importacao.update({
          where: { id: importacaoId },
          data: {
            status: "Erro",
            erros: 1,
          },
        });
      } catch (historicoError) {
        app.log.error(historicoError);
      }
    }

    return reply.status(500).send({
      error:
        error instanceof Error
          ? error.message
          : "Erro ao processar e salvar a planilha.",
    });
  }
});

// ==========================================
// HISTÓRICO DE IMPORTAÇÕES
// ==========================================

app.get("/api/importacoes", async (_request, reply) => {
  try {
    const importacoes = await prisma.importacao.findMany({
      orderBy: { importadoEm: "desc" },
      take: 50,
    });

    return {
      total: importacoes.length,
      importacoes,
    };
  } catch (error) {
    app.log.error(error);

    return reply.status(500).send({
      error: "Erro ao buscar histórico de importações.",
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

app.post("/api/ocorrencias/:id/enviar-email", async (request, reply) => {
  try {
    const { id } = request.params as { id: string };

    const ocorrencia = await prisma.ocorrencia.findUnique({
      where: { id },
    });

    if (!ocorrencia) {
      return reply.status(404).send({
        error: "Ocorrência não encontrada.",
      });
    }

    // Busca a NF original para obter informações adicionais,
    // como o código do cliente.
    const nota = await prisma.nota.findUnique({
      where: {
        numeroNf: ocorrencia.numeroNf,
      },
    });

    const resultado = await enviarEmailOcorrencia(
      ocorrencia,
      nota ?? undefined,
    );

    return {
      success: true,
      message: "E-mail enviado com sucesso!",
      emailId: resultado?.id || null,
    };
  } catch (error) {
    app.log.error(error);

    return reply.status(500).send({
      error:
        error instanceof Error
          ? error.message
          : "Erro ao enviar o e-mail da ocorrência.",
    });
  }
});

app.post("/api/teste-email", async (request, reply) => {
  try {
    const body = request.body as {
      email?: string;
    };

    if (!body.email) {
      return reply.status(400).send({
        error: "Informe um e-mail para o teste.",
      });
    }

    const resultado = await enviarEmailTeste(body.email);

    return {
      success: true,
      message: "E-mail de teste enviado com sucesso!",
      emailId: resultado?.id || null,
    };
  } catch (error) {
    app.log.error(error);

    return reply.status(500).send({
      error:
        error instanceof Error
          ? error.message
          : "Erro ao enviar e-mail de teste.",
    });
  }
});

app.post("/api/teste-email-template", async (request, reply) => {
  try {
    const body = request.body as {
      email?: string;
    };

    if (!body.email) {
      return reply.status(400).send({
        error: "Informe um e-mail para o teste.",
      });
    }

    const resultado = await enviarEmailTesteTemplate(body.email);

    return {
      success: true,
      message: "Template enviado com sucesso!",
      emailId: resultado?.id || null,
    };
  } catch (error) {
    app.log.error(error);

    return reply.status(500).send({
      error:
        error instanceof Error
          ? error.message
          : "Erro ao enviar template de teste.",
    });
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
