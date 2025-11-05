import type {
  OrderItem,
  PaymentCondition,
} from "@/presentation/types/order.types";

// Tipos para html2pdf.js
interface Html2PdfOptions {
  margin?: number | [number, number, number, number];
  filename?: string;
  image?: { type: string; quality: number };
  html2canvas?: { scale: number; useCORS: boolean };
  jsPDF?: { unit: string; format: string; orientation: string };
}

export interface OrderPrintData {
  orderNumber?: string;
  userName?: string;
  orderStatus?: string;
  client: {
    code: string;
    client: string;
    city?: string;
  };
  paymentCondition: PaymentCondition;
  items: OrderItem[];
  notes?: string;
  totals: {
    totalPieces: number;
    subtotal: number;
    totalCommission: number;
    shippingRate: number;
    total: number;
  };
  discounts?: Array<{
    id: string;
    name: string;
    discount_percentage: number | string;
  }>;
}

// Função para salvar como PDF - única função de exportação
export async function saveToPDF(data: OrderPrintData): Promise<void> {
  const printHTML = generatePrintHTML(data);
  const clientName = data.client.client.replace(/[^a-zA-Z0-9]/g, "_");
  const orderCode = data.client.code.replace(/[^a-zA-Z0-9]/g, "_");
  const date = new Date().toISOString().split("T")[0];
  const filePrefix = data.orderStatus === "draft" ? "COTACAO" : "PEDIDO";
  const filename = `${filePrefix}_${clientName}_${orderCode}_${date}.pdf`;

  try {
    const html2pdf = (await import("html2pdf.js" as any)).default;

    if (!html2pdf) {
      throw new Error("Biblioteca html2pdf não carregada");
    }

    // Configurações otimizadas para melhor qualidade
    await html2pdf()
      .set({
        margin: [10, 10, 10, 10], // Margem equilibrada
        filename: filename,
        image: {
          type: "jpeg",
          quality: 0.98, // Qualidade máxima
        },
        html2canvas: {
          scale: 2, // Maior escala para melhor qualidade
          useCORS: true,
          letterRendering: true,
          logging: false,
        },
        jsPDF: {
          unit: "mm",
          format: "a4",
          orientation: "portrait",
        },
        pagebreak: {
          before: ".page-break-before",
          after: ".page-break-after",
          avoid: ".no-break",
        },
      })
      .from(printHTML)
      .save();
  } catch (error) {
    alert("Erro ao gerar PDF. Por favor, tente novamente.");
  }
}

// Função que gera o HTML - COMPLETAMENTE REDESENHADA
export function generatePrintHTML(data: OrderPrintData): string {
  const {
    client,
    paymentCondition,
    items,
    notes,
    totals,
    orderNumber,
    userName,
    orderStatus,
    discounts,
  } = data;

  // Mapeamento dos status
  const statusMapping: Record<string, string> = {
    draft: "COTAÇÃO",
    confirmed: "PEDIDO CONFIRMADO",
    processing: "EM PROCESSAMENTO",
    shipped: "ENVIADO",
    delivered: "ENTREGUE",
    cancelled: "CANCELADO",
  };

  const statusTitle = orderStatus
    ? statusMapping[orderStatus] || "PEDIDO DE VENDA"
    : "PEDIDO DE VENDA";

  const statusColors: Record<string, string> = {
    draft: "#6B7280", // Cinza
    confirmed: "#10B981", // Verde
    processing: "#F59E0B", // Amarelo
    shipped: "#3B82F6", // Azul
    delivered: "#059669", // Verde escuro
    cancelled: "#EF4444", // Vermelho
  };

  const statusColor = orderStatus
    ? statusColors[orderStatus] || "#1F2937"
    : "#1F2937";

  // Controle de exibição: desconto só aparece para pedidos confirmados
  const showDiscountColumn = orderStatus === "confirmed";

  // Função auxiliar para formatar valores
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("pt-BR").format(value);
  };

  // Função para obter o display do desconto
  const getDiscountDisplay = (item: OrderItem) => {
    if (item.discount_name) return item.discount_name;
    if (item.discount_percentage > 0) {
      const matchingDiscount = discounts?.find(
        (d) =>
          parseFloat(d.discount_percentage.toString()) ===
          item.discount_percentage
      );
      return matchingDiscount
        ? matchingDiscount.name
        : `${item.discount_percentage.toFixed(2)}%`;
    }
    return "-";
  };

  const getDisplayClientRef = (clientRef?: string) => {
    if (!clientRef || clientRef.startsWith("BULK_ADD_")) return "-";
    return clientRef;
  };

  // Não quebrar em grupos - deixar a quebra natural do PDF
  const itemGroups = [items]; // Um único grupo com todos os itens

  // Resumo: peças por grupo
  const groupNameToQuantity: Record<string, number> = {};
  for (const item of items) {
    const groupName = (item.product_group_name || "Sem grupo").trim();
    const qty = Number(item.quantity || 0);
    groupNameToQuantity[groupName] = (groupNameToQuantity[groupName] || 0) + qty;
  }
  const groupPiecesSummary = Object.entries(groupNameToQuantity)
    .sort(([a], [b]) => a.localeCompare(b, "pt-BR"))
    .map(
      ([group, qty]) => `
        <div class="group-row">
          <span class="group-name">${group}</span>
          <span class="group-qty font-mono">${formatNumber(qty)}</span>
        </div>
      `,
    )
    .join("");

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <title>${statusTitle} - ${client.client}</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          /* Reset e Base */
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          /* Margens do PDF ajustadas */
          @page {
            size: A4;
            margin: 10mm;
          }

          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            font-size: 11px;
            line-height: 1.6;
            color: #1F2937;
            background: white;
            margin: 0;
            padding: 0;
          }

          .container {
            max-width: 100%;
            margin: 0;
            padding: 0;
          }

          /* Cabeçalho Profissional */
          .header {
            background: linear-gradient(135deg, ${statusColor} 0%, ${statusColor}dd 100%);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            margin-bottom: 10px;
            position: relative;
            overflow: hidden;
          }

          .header::before {
            content: '';
            position: absolute;
            top: -50%;
            right: -10%;
            width: 200px;
            height: 200px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 50%;
          }

          .header-content {
            position: relative;
            z-index: 1;
          }

          .header h1 {
            font-size: 22px;
            font-weight: 700;
            margin-bottom: 8px;
            letter-spacing: 0.5px;
          }

          .header-info {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 12px;
            opacity: 0.95;
          }

          .header-info span {
            display: flex;
            align-items: center;
            gap: 5px;
          }

          /* Cards de Informação */
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 20px;
          }

          .info-card {
            background: #F9FAFB;
            border: 1px solid #E5E7EB;
            border-radius: 8px;
            padding: 12px 15px;
            transition: all 0.3s ease;
          }

          .info-card h3 {
            font-size: 12px;
            font-weight: 600;
            color: #6B7280;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
          }

          .info-card .info-content {
            font-size: 14px;
            color: #111827;
          }

          .info-card .info-row {
            display: flex;
            justify-content: space-between;
            padding: 5px 0;
            border-bottom: 1px solid #E5E7EB;
          }

          .info-card .info-row:last-child {
            border-bottom: none;
          }

          .info-card .label {
            font-weight: 500;
            color: #6B7280;
          }

          .info-card .value {
            font-weight: 600;
            color: #111827;
          }

          /* Tabela Moderna */
          .table-section {
            margin-bottom: 15px;
          }

          .table-header {
            background: #F3F4F6;
            padding: 12px 15px;
            border-radius: 8px 8px 0 0;
            border: 1px solid #E5E7EB;
            border-bottom: none;
          }

          .table-header h3 {
            font-size: 14px;
            font-weight: 600;
            color: #111827;
            margin: 0;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            background: white;
            border: 1px solid #E5E7EB;
            border-radius: 0 0 8px 8px;
          }

          thead tr {
            background: #F9FAFB;
          }

          th {
            padding: 10px 8px;
            text-align: left;
            font-weight: 600;
            font-size: 10px;
            color: #374151;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border-bottom: 2px solid #E5E7EB;
          }

          td {
            padding: 8px;
            border-bottom: 1px solid #F3F4F6;
            font-size: 11px;
          }

          tbody tr:hover {
            background: #F9FAFB;
          }

          tbody tr:last-child td {
            border-bottom: none;
          }

          .text-right {
            text-align: right;
          }

          .text-center {
            text-align: center;
          }

          .font-mono {
            font-family: 'Courier New', monospace;
          }

          .font-bold {
            font-weight: 600;
          }

          .product-name { font-weight: 600; }
          .product-group { color: #6B7280; font-size: 10px; margin-top: 2px; }

          /* Totais */
          .totals-container {
            display: flex;
            justify-content: flex-end;
            margin-top: 20px;
          }

          .totals-card {
            background: #F9FAFB;
            border: 2px solid #E5E7EB;
            border-radius: 8px;
            padding: 20px;
            width: 350px;
          }

          .totals-card h3 {
            font-size: 14px;
            font-weight: 600;
            color: #111827;
            margin-bottom: 15px;
            text-align: center;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .total-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px solid #E5E7EB;
          }

          .group-summary {
            margin: 6px 0 10px 0;
          }

          .group-summary-title {
            font-size: 10px;
            color: #6B7280;
            margin-bottom: 4px;
          }

          .group-row {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            font-size: 11px;
            padding: 2px 0;
            gap: 8px;
          }

          .group-name {
            flex: 1 1 auto;
            padding-right: 8px;
            white-space: normal;
            word-break: break-word;
            overflow: visible;
          }
          .group-qty { flex: 0 0 auto; white-space: nowrap; }

          .total-row:last-child {
            border-bottom: none;
            margin-top: 10px;
            padding-top: 15px;
            border-top: 2px solid #374151;
          }

          .total-label {
            font-size: 12px;
            color: #6B7280;
          }

          .total-value {
            font-size: 14px;
            font-weight: 600;
            color: #111827;
          }

          .total-final .total-label,
          .total-final .total-value {
            font-size: 16px;
            font-weight: 700;
            color: ${statusColor};
          }

          /* Notas */
          .notes-section {
            background: #FEF3C7;
            border: 1px solid #FDE68A;
            border-radius: 8px;
            padding: 15px;
            margin-top: 20px;
          }

          .notes-section h3 {
            font-size: 14px;
            font-weight: 600;
            color: #92400E;
            margin-bottom: 10px;
          }

          .notes-content {
            color: #78350F;
            line-height: 1.6;
            white-space: pre-wrap;
          }

          /* Rodapé */
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #E5E7EB;
            text-align: center;
            color: #6B7280;
            font-size: 10px;
          }

          .footer p {
            margin: 5px 0;
          }

          .footer a {
            color: ${statusColor};
            text-decoration: none;
            font-weight: 600;
          }

          /* Quebras de página */
          .page-break-before {
            page-break-before: always;
          }

          .page-break-after {
            page-break-after: always;
          }

          .no-break {
            page-break-inside: avoid;
          }

          /* Impressão */
          @media print {
            body {
              margin: 0;
              padding: 0;
            }

            .header {
              background: ${statusColor} !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }

            .info-card,
            .totals-card,
            .notes-section {
              background: #F9FAFB !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }

            table {
              font-size: 10px;
            }

            .page-break-before {
              page-break-before: always;
            }

            .no-break {
              page-break-inside: avoid;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <!-- Cabeçalho -->
          <div class="header no-break">
            <div class="header-content">
              <h1>${statusTitle}</h1>
              <div class="header-info">
                <span>
                  <strong>Pedido:</strong> #${orderNumber || "N/A"}
                </span>
                <span>
                  <strong>Data:</strong> ${new Date().toLocaleDateString(
                    "pt-BR",
                    {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    }
                  )}
                </span>
                <span>
                  <strong>Representante:</strong> ${userName || "Sistema"}
                </span>
              </div>
            </div>
          </div>

          <!-- Dados do Cliente -->
          <div class="info-card no-break" style="margin-bottom: 10px;">
            <h3>Dados do Cliente</h3>
            <div class="info-content">
              <div class="info-row">
                <span class="label">Código:</span>
                <span class="value">${client.code}</span>
              </div>
              <div class="info-row">
                <span class="label">Nome:</span>
                <span class="value">${client.client}</span>
              </div>
              ${
                client.city
                  ? `
              <div class="info-row">
                <span class="label">Cidade:</span>
                <span class="value">${client.city}</span>
              </div>
              `
                  : ""
              }
            </div>
          </div>

          <!-- Condição de Pagamento -->
          <div class="info-card no-break" style="margin-bottom: 15px;">
            <h3>Condição de Pagamento</h3>
            <div class="info-content">
              <div class="info-row">
                <span class="label">Condição:</span>
                <span class="value">
                  ${paymentCondition.name}
                  ${
                    paymentCondition.is_cash
                      ? '<span style="color: #10B981; margin-left: 5px;">(À Vista)</span>'
                      : ""
                  }
                </span>
              </div>
            </div>
          </div>

          <!-- Observações -->
          ${
            notes
              ? `
          <div class="notes-section no-break" style="margin-bottom: 15px;">
            <h3>Observações</h3>
            <div class="notes-content">${notes}</div>
          </div>
          `
              : ""
          }

          <!-- Tabela de Itens -->
          <div class="table-section">
            <div class="table-header">
              <h3>Itens do Pedido</h3>
            </div>
            <table>
              <thead>
                <tr>
                  <th class="text-center" style="width: 4%;">#</th>
                  <th class="text-center" style="width: 6%;">Pend.</th>
                  <th style="width: 30%;">Produto</th>
                  <th style="width: 13%;">Ref. Cliente</th>
                  <th class="text-center" style="width: 8%;">Qtd</th>
                  ${
                    showDiscountColumn
                      ? '<th class="text-center" style="width: 13%;">Desc. %</th>'
                      : ''
                  }
                  <th class="text-right" style="width: 13%;">Preço Unit.</th>
                  <th class="text-right" style="width: 13%;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${items
                  .map(
                    (item, index) => `
                  <tr class="no-break">
                    <td class="text-center" style="color: #6B7280; font-weight: 500;">${
                      index + 1
                    }</td>
                    <td class="text-center" style="color: ${
                      item.has_pending ? "#EF4444" : "#9CA3AF"
                    }; font-weight: ${item.has_pending ? "600" : "400"};">
                      ${
                        item.has_pending && item.pending_quantity
                          ? item.pending_quantity
                          : "-"
                      }
                    </td>
                    <td>
                      <div class="product-name">${item.product_name}</div>
                      ${item.product_group_name ? `<div class="product-group">${item.product_group_name}</div>` : ''}
                    </td>
                    <td class="text-center">${getDisplayClientRef(
                      item.client_ref
                    )}</td>
                    <td class="text-center">${formatNumber(item.quantity)}</td>
                    ${
                      showDiscountColumn
                        ? `<td class="text-center" style="color: #EF4444; font-weight: 500;">${getDiscountDisplay(
                            item
                          )}</td>`
                        : ''
                    }
                    <td class="text-right font-mono">${formatCurrency(
                      item.unit_price
                    )}</td>
                    <td class="text-right font-mono font-bold">${formatCurrency(
                      item.quantity * item.unit_price
                    )}</td>
                  </tr>
                `
                  )
                  .join("")}
              </tbody>
            </table>
          </div>

          <!-- Totais -->
          <div class="totals-container no-break">
            <div class="totals-card">
              <h3>Resumo do Pedido</h3>          

              ${
                groupPiecesSummary
                  ? `
              <div class="group-summary">
                <div class="group-summary-title">Peças por grupo</div>
                ${groupPiecesSummary}
              </div>
              `
                  : ""
              }

              <div class="total-row">
                <span class="total-label">Total de Peças:</span>
                <span class="total-value">${formatNumber(
                  totals.totalPieces
                )}</span>
              </div>

              <div class="total-row">
                <span class="total-label">Subtotal:</span>
                <span class="total-value">${formatCurrency(
                  totals.subtotal
                )}</span>
              </div>

              ${
                totals.shippingRate > 0
                  ? `
              <div class="total-row">
                <span class="total-label">Taxa de Frete:</span>
                <span class="total-value" style="color: #3B82F6;">${formatCurrency(
                  totals.shippingRate
                )}</span>
              </div>
              `
                  : ""
              }

              ${
                orderStatus === "confirmed" && totals.totalCommission > 0
                  ? `
              <div class="total-row">
                <span class="total-label">Total Comissão:</span>
                <span class="total-value" style="color: #10B981;">${formatCurrency(
                  totals.totalCommission
                )}</span>
              </div>
              `
                  : ""
              }

              <div class="total-row total-final">
                <span class="total-label">TOTAL FINAL:</span>
                <span class="total-value">${formatCurrency(totals.total)}</span>
              </div>
            </div>
          </div>


          <!-- Rodapé -->
          <div class="footer">
            <p>Documento gerado por ${userName} em ${new Date().toLocaleString(
    "pt-BR"
  )}</p>
            <p>
              <strong>SGP - Sistema de Gestão de Pedidos</strong> |
              Desenvolvido por <a href="https://www.linkedin.com/in/joelsonlopes/" target="_blank">Joelson Lopes</a>
            </p>
          </div>
        </div>
      </body>
    </html>
  `;
}
