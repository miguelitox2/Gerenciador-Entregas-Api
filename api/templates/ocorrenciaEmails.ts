function moeda(valor: number | null | undefined): string {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function numero(valor: number | null | undefined): string {
  return Number(valor || 0).toLocaleString("pt-BR", {
    maximumFractionDigits: 2,
  });
}

function escapeHtml(valor: unknown): string {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatarData(valor: Date | string | null | undefined): string {
  return new Date(valor || Date.now()).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function obterCriadoPor(ocorrencia: any): string {
  if (ocorrencia.criadoPor && typeof ocorrencia.criadoPor === "object") {
    return ocorrencia.criadoPor.nome || ocorrencia.criadoPorEmail || "Sistema";
  }

  return ocorrencia.criadoPorEmail || "Sistema";
}

/* =========================================================
   CARD DE RESUMO
========================================================= */

function cardResumo(titulo: string, valor: string, destaque = false): string {
  const background = destaque ? "#f0fdf4" : "#ffffff";

  const border = destaque ? "#bbf7d0" : "#d1d5db";

  const color = destaque ? "#15803d" : "#111827";

  return `
    <td
      width="49%"
      bgcolor="${background}"
      style="
        width:49%;
        padding:7px 9px;
        background-color:${background};
        border:1px solid ${border};
      "
    >

      <div
        style="
          font-size:7px;
          line-height:9px;
          color:${destaque ? "#15803d" : "#6b7280"};
          text-transform:uppercase;
          letter-spacing:.5px;
        "
      >
        ${escapeHtml(titulo)}
      </div>

      <div
        style="
          margin-top:2px;
          font-size:12px;
          line-height:14px;
          font-weight:bold;
          color:${color};
        "
      >
        ${valor}
      </div>

    </td>
  `;
}

/* =========================================================
   RESUMO
========================================================= */

function gerarResumo(ocorrencia: any, unidade: string): string {
  return `
    <table
      width="100%"
      cellpadding="0"
      cellspacing="0"
      border="0"
    >

      <tr>

        ${cardResumo("Valor da NF", moeda(ocorrencia.valorNota))}

        <td width="2%"></td>

        ${cardResumo(
          "Peso da NF",
          `${numero(ocorrencia.pesoNota)} ${escapeHtml(unidade)}`,
        )}

      </tr>

      <tr>
        <td
          colspan="3"
          height="4"
          style="height:4px;font-size:1px;line-height:4px;"
        >
          &nbsp;
        </td>
      </tr>

      <tr>

        ${cardResumo(
          "Peso devolvido",
          `${numero(ocorrencia.totalPeso)} ${escapeHtml(unidade)}`,
        )}

        <td width="2%"></td>

        ${cardResumo("Valor devolvido", moeda(ocorrencia.totalValor), true)}

      </tr>

    </table>
  `;
}

/* =========================================================
   ITENS
========================================================= */

function gerarItens(ocorrencia: any): string {
  const itens = Array.isArray(ocorrencia.itens) ? ocorrencia.itens : [];

  if (!itens.length) {
    return `
      <tr>
        <td
          colspan="5"
          align="center"
          style="
            padding:8px;
            font-size:10px;
            color:#6b7280;
          "
        >
          Nenhum item informado.
        </td>
      </tr>
    `;
  }

  return itens
    .map(
      (item: any) => `
        <tr>

          <td
            style="
              padding:5px 7px;
              border-bottom:1px solid #e5e7eb;
              font-size:10px;
              color:#4b5563;
            "
          >
            ${escapeHtml(item.codigo || "-")}
          </td>

          <td
            style="
              padding:5px 7px;
              border-bottom:1px solid #e5e7eb;
              font-size:10px;
              color:#111827;
            "
          >
            ${escapeHtml(item.descricao || "-")}
          </td>

          <td
            align="right"
            style="
              padding:5px 7px;
              border-bottom:1px solid #e5e7eb;
              font-size:10px;
              color:#4b5563;
            "
          >
            ${numero(item.quantidade)}
          </td>

          <td
            align="right"
            style="
              padding:5px 7px;
              border-bottom:1px solid #e5e7eb;
              font-size:10px;
              color:#4b5563;
            "
          >
            ${numero(item.pesoLiquido)}
          </td>

          <td
            align="right"
            style="
              padding:5px 7px;
              border-bottom:1px solid #e5e7eb;
              font-size:10px;
              font-weight:bold;
              color:#111827;
            "
          >
            ${moeda(item.valorTotal)}
          </td>

        </tr>
      `,
    )
    .join("");
}

/* =========================================================
   CLIENTE / VENDEDOR
========================================================= */

function gerarPessoa(titulo: string, nome: string, complemento = ""): string {
  return `
    <td
      width="49%"
      bgcolor="#f8fafc"
      style="
        width:49%;
        padding:8px 9px;
        background-color:#f8fafc;
        border:1px solid #d1d5db;
      "
    >

      <div
        style="
          font-size:7px;
          line-height:9px;
          color:#6b7280;
          text-transform:uppercase;
          letter-spacing:.5px;
        "
      >
        ${escapeHtml(titulo)}
      </div>

      <div
        style="
          margin-top:2px;
          font-size:11px;
          line-height:14px;
          font-weight:bold;
          color:#111827;
        "
      >
        ${escapeHtml(nome)}
      </div>

      ${
        complemento
          ? `
        <div
          style="
            margin-top:1px;
            font-size:8px;
            line-height:10px;
            color:#6b7280;
          "
        >
          ${complemento}
        </div>
      `
          : ""
      }

    </td>
  `;
}

/* =========================================================
   TEMPLATE PRINCIPAL
========================================================= */

export function gerarEmailOcorrencia(ocorrencia: any, nota?: any): string {
  const numeroNf = ocorrencia.numeroNfOriginal || ocorrencia.numeroNf || "-";

  const unidade = ocorrencia.unidade || "kg";

  const codigoCliente = nota?.codigoCliente || "-";

  const observacao = ocorrencia.observacao
    ? `
      <div
        style="
          margin-top:10px;
          margin-bottom:4px;
          font-size:11px;
          line-height:14px;
          font-weight:bold;
          color:#111827;
        "
      >
        Observação
      </div>

      <table
        width="100%"
        cellpadding="0"
        cellspacing="0"
        border="0"
        bgcolor="#fffbeb"
        style="
          background-color:#fffbeb;
          border:1px solid #fde68a;
        "
      >

        <tr>

          <td
            style="
              padding:7px 9px;
              font-size:10px;
              line-height:14px;
              color:#4b5563;
            "
          >
            ${escapeHtml(ocorrencia.observacao)}
          </td>

        </tr>

      </table>
    `
    : "";

  return `
<!DOCTYPE html>

<html lang="pt-BR">

<head>

  <meta charset="UTF-8">

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1"
  >

  <meta
    name="color-scheme"
    content="light"
  >

  <meta
    name="supported-color-schemes"
    content="light"
  >

</head>

<body
  style="
    margin:0;
    padding:0;
    background:#f3f4f6;
    font-family:Arial,Helvetica,sans-serif;
    color:#111827;
  "
>

<table
  width="100%"
  cellpadding="0"
  cellspacing="0"
  border="0"
  bgcolor="#f3f4f6"
  style="
    background-color:#f3f4f6;
    padding:12px 8px;
  "
>

<tr>

<td align="center">

<!-- CONTAINER -->

<table
  width="560"
  cellpadding="0"
  cellspacing="0"
  border="0"
  bgcolor="#ffffff"
  style="
    width:100%;
    max-width:560px;
    background-color:#ffffff;
    border:1px solid #d1d5db;
  "
>

<!-- HEADER -->

<tr>

<td
  bgcolor="#172033"
  style="
    background-color:#172033;
    padding:13px 16px;
  "
>

  <div
    style="
      font-size:7px;
      line-height:9px;
      font-weight:bold;
      letter-spacing:1.4px;
      color:#a7f3d0;
      text-transform:uppercase;
    "
  >
    Gerenciador de Entregas
  </div>

  <div
    style="
      margin-top:2px;
      font-size:17px;
      line-height:20px;
      font-weight:bold;
      color:#ffffff;
    "
  >
    Registro de ocorrência
  </div>

</td>

</tr>

<!-- CONTEÚDO -->

<tr>

<td
  bgcolor="#ffffff"
  style="
    background-color:#ffffff;
    padding:14px 16px;
  "
>

  <!-- IDENTIFICAÇÃO -->

  <div
    style="
      font-size:7px;
      line-height:9px;
      font-weight:bold;
      letter-spacing:1px;
      color:#6b7280;
      text-transform:uppercase;
    "
  >
    Ocorrência de devolução
  </div>

  <div
    style="
      margin-top:2px;
      font-size:18px;
      line-height:21px;
      font-weight:bold;
      color:#111827;
    "
  >
    Nota Fiscal #${escapeHtml(numeroNf)}
  </div>

  <!-- CLIENTE / VENDEDOR -->

  <table
    width="100%"
    cellpadding="0"
    cellspacing="0"
    border="0"
    style="margin-top:9px;"
  >

    <tr>

      ${gerarPessoa(
        "Cliente",
        ocorrencia.cliente || "-",
        `Código: ${escapeHtml(codigoCliente)}`,
      )}

      <td width="2%"></td>

      ${gerarPessoa("Vendedor", ocorrencia.vendedor || "-")}

    </tr>

  </table>

  <!-- RESUMO -->

  <div
    style="
      margin-top:10px;
      margin-bottom:4px;
      font-size:11px;
      line-height:14px;
      font-weight:bold;
      color:#111827;
    "
  >
    Resumo da ocorrência
  </div>

  ${gerarResumo(ocorrencia, unidade)}

  <!-- ITENS -->

  <div
    style="
      margin-top:10px;
      margin-bottom:4px;
      font-size:11px;
      line-height:14px;
      font-weight:bold;
      color:#111827;
    "
  >
    Itens devolvidos
  </div>

  <table
    width="100%"
    cellpadding="0"
    cellspacing="0"
    border="0"
    bgcolor="#ffffff"
    style="
      width:100%;
      background-color:#ffffff;
      border:1px solid #d1d5db;
      border-collapse:collapse;
    "
  >

    <thead>

      <tr>

        <th
          align="left"
          bgcolor="#f3f4f6"
          style="
            padding:5px 7px;
            background:#f3f4f6;
            font-size:7px;
            color:#6b7280;
            border-bottom:1px solid #d1d5db;
          "
        >
          CÓDIGO
        </th>

        <th
          align="left"
          bgcolor="#f3f4f6"
          style="
            padding:5px 7px;
            background:#f3f4f6;
            font-size:7px;
            color:#6b7280;
            border-bottom:1px solid #d1d5db;
          "
        >
          PRODUTO
        </th>

        <th
          align="right"
          bgcolor="#f3f4f6"
          style="
            padding:5px 7px;
            background:#f3f4f6;
            font-size:7px;
            color:#6b7280;
            border-bottom:1px solid #d1d5db;
          "
        >
          QTD.
        </th>

        <th
          align="right"
          bgcolor="#f3f4f6"
          style="
            padding:5px 7px;
            background:#f3f4f6;
            font-size:7px;
            color:#6b7280;
            border-bottom:1px solid #d1d5db;
          "
        >
          PESO
        </th>

        <th
          align="right"
          bgcolor="#f3f4f6"
          style="
            padding:5px 7px;
            background:#f3f4f6;
            font-size:7px;
            color:#6b7280;
            border-bottom:1px solid #d1d5db;
          "
        >
          VALOR
        </th>

      </tr>

    </thead>

    <tbody>

      ${gerarItens(ocorrencia)}

    </tbody>

  </table>

  <!-- TIPO DE DEVOLUÇÃO -->

  <table
    width="100%"
    cellpadding="0"
    cellspacing="0"
    border="0"
    bgcolor="#f8fafc"
    style="
      margin-top:10px;
      background-color:#f8fafc;
      border:1px solid #d1d5db;
    "
  >

    <tr>

      <td
        width="3"
        bgcolor="#16a34a"
        style="
          width:3px;
          background-color:#16a34a;
        "
      ></td>

      <td
        style="
          padding:7px 9px;
        "
      >

        <div
          style="
            font-size:7px;
            line-height:9px;
            color:#6b7280;
            text-transform:uppercase;
            letter-spacing:.5px;
          "
        >
          Tipo de devolução
        </div>

        <div
          style="
            margin-top:1px;
            font-size:11px;
            line-height:14px;
            font-weight:bold;
            color:#111827;
          "
        >
          ${escapeHtml(ocorrencia.motivo || "-")}
        </div>

      </td>

    </tr>

  </table>

  ${observacao}

</td>

</tr>

<!-- RODAPÉ -->

<tr>

<td
  bgcolor="#f8fafc"
  style="
    background-color:#f8fafc;
    border-top:1px solid #e5e7eb;
    padding:9px 16px;
  "
>

  <table
    width="100%"
    cellpadding="0"
    cellspacing="0"
    border="0"
  >

    <tr>

      <td>

        <div
          style="
            font-size:8px;
            color:#6b7280;
          "
        >
          Registrado por
        </div>

        <div
          style="
            margin-top:1px;
            font-size:9px;
            font-weight:bold;
            color:#374151;
          "
        >
          ${escapeHtml(obterCriadoPor(ocorrencia))}
        </div>

      </td>

      <td align="right">

        <div
          style="
            font-size:8px;
            color:#6b7280;
          "
        >
          Data do registro
        </div>

        <div
          style="
            margin-top:1px;
            font-size:9px;
            font-weight:bold;
            color:#374151;
          "
        >
          ${escapeHtml(formatarData(ocorrencia.criadoEm))}
        </div>

      </td>

    </tr>

  </table>

  <div
    style="
      margin-top:5px;
      padding-top:5px;
      border-top:1px solid #e5e7eb;
      font-size:7px;
      color:#9ca3af;
    "
  >
    E-mail gerado automaticamente pelo Gerenciador de Entregas.
  </div>

</td>

</tr>

</table>

</td>

</tr>

</table>

</body>

</html>
  `;
}
