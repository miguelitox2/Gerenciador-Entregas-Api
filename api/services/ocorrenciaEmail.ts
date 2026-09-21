import { Resend } from "resend";
import { Prisma } from "@prisma/client";

import { gerarEmailOcorrencia } from "../templates/ocorrenciaEmails";

const EMAIL_PADRAO_REMETENTE =
  "Gerenciador de Entregas <onboarding@resend.dev>";

type OcorrenciaEmail = Prisma.OcorrenciaGetPayload<{}>;

type NotaEmail = Prisma.NotaGetPayload<{}>;

function obterResend() {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error("RESEND_API_KEY não está configurada.");
  }

  return new Resend(apiKey);
}

function obterRemetente() {
  return process.env.RESEND_FROM_EMAIL || EMAIL_PADRAO_REMETENTE;
}

function normalizarEmails(valor?: string | null): string[] {
  if (!valor) {
    return [];
  }

  return valor
    .split(/[;,]/)
    .map((email) => email.trim())
    .filter(Boolean);
}

async function enviarEmail({
  para,
  cc,
  assunto,
  html,
}: {
  para: string[];
  cc?: string[];
  assunto: string;
  html: string;
}) {
  if (para.length === 0) {
    throw new Error(
      "Nenhum destinatário foi informado para o envio do e-mail.",
    );
  }

  const resend = obterResend();

  const resultado = await resend.emails.send({
    from: obterRemetente(),
    to: para,
    ...(cc && cc.length > 0 ? { cc } : {}),
    subject: assunto,
    html,
  });

  if (resultado.error) {
    throw new Error(resultado.error.message);
  }

  return resultado.data;
}

/**
 * Envia o e-mail de uma ocorrência real.
 */
export async function enviarEmailOcorrencia(
  ocorrencia: OcorrenciaEmail,
  nota?: NotaEmail,
) {
  const para = normalizarEmails(ocorrencia.para);
  const cc = normalizarEmails(ocorrencia.cc);

  const numeroNf = ocorrencia.numeroNfOriginal || ocorrencia.numeroNf || "-";

  const html = gerarEmailOcorrencia(ocorrencia, nota);

  return enviarEmail({
    para,
    cc,
    assunto: `Ocorrência de devolução — NF ${numeroNf}`,
    html,
  });
}

/**
 * Teste simples da integração com o Resend.
 */
export async function enviarEmailTeste(emailDestino: string) {
  const html = `
    <div
      style="
        font-family: Arial, sans-serif;
        padding: 30px;
      "
    >
      <h2 style="color: #111827;">
        Gerenciador de Entregas
      </h2>

      <p>
        Este é um
        <strong>teste de envio de e-mail</strong>.
      </p>

      <p>
        A integração com o Resend está funcionando
        corretamente.
      </p>

      <hr />

      <p
        style="
          font-size: 12px;
          color: #777;
        "
      >
        E-mail enviado pelo ambiente local.
      </p>
    </div>
  `;

  return enviarEmail({
    para: [emailDestino],
    assunto: "Teste de envio — Gerenciador de Entregas",
    html,
  });
}

/**
 * Dados fictícios para teste visual do template.
 */
const OCORRENCIA_TESTE = {
  numeroNf: "NF202211",
  numeroNfOriginal: "202211",

  cliente: "SUPERMERCADOS DEFAVARI LTDA",
  vendedor: "RENATO PEREIRA JARDIM",

  motivo: "Devolução parcial",

  observacao: "Recusa por perda de vácuo.",

  unidade: "kg",

  totalQtd: 10,
  totalPeso: 35.2,
  totalValor: 680,

  valorNota: 2450,
  pesoNota: 125.5,

  criadoPor: {
    nome: "Vinicius",
    email: "vinicius.fabricioap@outlook.com",
  },

  criadoPorEmail: "vinicius.fabricioap@outlook.com",

  criadoEm: new Date(),

  itens: [
    {
      codigo: "789123",
      descricao: "Presunto Cozido",
      quantidade: 5,
      pesoLiquido: 12.5,
      valorTotal: 312.5,
    },
    {
      codigo: "789456",
      descricao: "Queijo Mussarela",
      quantidade: 3,
      pesoLiquido: 9.2,
      valorTotal: 210,
    },
    {
      codigo: "789789",
      descricao: "Linguiça Toscana",
      quantidade: 2,
      pesoLiquido: 8.5,
      valorTotal: 157.5,
    },
  ],
};

const NOTA_TESTE = {
  codigoCliente: "38443",
};

/**
 * Envia uma ocorrência fictícia utilizando
 * o mesmo template das ocorrências reais.
 */
export async function enviarEmailTesteTemplate(emailDestino: string) {
  const html = gerarEmailOcorrencia(OCORRENCIA_TESTE, NOTA_TESTE);

  return enviarEmail({
    para: [emailDestino],
    assunto: "Ocorrência de devolução — NF 202211",
    html,
  });
}
