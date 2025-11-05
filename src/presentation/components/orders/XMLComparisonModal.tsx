"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useIsMobile } from "@/presentation/hooks/use-mobile";
import { SessionManager } from "@/shared/infrastructure/session/session-manager";
import {
  AlertTriangle,
  CheckCircle,
  Download,
  FileCheck,
  Info,
  Upload,
  X,
  XCircle,
} from "lucide-react";
import React, { useRef, useState } from "react";
import { toast } from "sonner";

interface XMLComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  orderData?: {
    order_number: string;
    client_name: string;
    items: Array<{
      product_code: string;
      product_name: string;
      quantity: number;
      unit_price: number;
    }>;
  };
}

// Tipos para o parser de XML
interface NFeItem {
  codigo: string;
  descricao: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
}

interface NFeData {
  numero: string;
  dataEmissao: string;
  valorTotal: number;
  emitente: {
    nome: string;
    cnpj: string;
  };
  destinatario: {
    nome: string;
    cnpj: string;
  };
  itens: NFeItem[];
}

interface ComparisonItem {
  codigo: string;
  descricao: string;
  status: "completo" | "parcial" | "pendente" | "extra";
  quantidadePedido: number;
  quantidadeNota: number;
  diferenca: number;
  valorUnitarioPedido?: number;
  valorUnitarioNota?: number;
}

interface ComparisonResult {
  notaFiscal: {
    numero: string;
    dataEmissao: string;
    valorTotal: number;
    emitente: string;
    destinatario: string;
  };
  resumo: {
    totalItensPedido: number;
    totalItensNota: number;
    itensCompletos: number;
    itensParciais: number;
    itensPendentes: number;
    itensExtras: number;
  };
  detalhes: ComparisonItem[];
}

export function XMLComparisonModal({
  isOpen,
  onClose,
  orderId,
  orderData,
}: XMLComparisonModalProps) {
  const isMobile = useIsMobile();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<"upload" | "processing" | "results">(
    "upload"
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [comparisonResult, setComparisonResult] =
    useState<ComparisonResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Reset estados ao abrir modal
  const handleModalOpen = () => {
    if (isOpen) {
      setStep("upload");
      setSelectedFile(null);
      setComparisonResult(null);
      setError(null);
      setIsProcessing(false);
    }
  };

  React.useEffect(() => {
    handleModalOpen();
  }, [isOpen]);

  // Função para extrair código limpo do produto
  const extractProductCode = (description: string): string => {
    const match = description.match(/^([A-Z0-9\/\-]+)/);
    return match ? match[1].trim() : description.trim();
  };

  // Parser básico de XML da NFe
  const parseNFeXML = (xmlContent: string): NFeData => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlContent, "text/xml");

    // Verificar se é um XML válido
    if (doc.querySelector("parsererror")) {
      throw new Error("Arquivo XML inválido");
    }

    // Extrair dados principais
    const numero = doc.querySelector("nNF")?.textContent || "";
    const dataEmissao = doc.querySelector("dhEmi")?.textContent || "";
    const valorTotal = parseFloat(
      doc.querySelector("total vNF")?.textContent || "0"
    );

    // Dados do emitente
    const emitente = {
      nome: doc.querySelector("emit xNome")?.textContent || "",
      cnpj: doc.querySelector("emit CNPJ")?.textContent || "",
    };

    // Dados do destinatário
    const destinatario = {
      nome: doc.querySelector("dest xNome")?.textContent || "",
      cnpj: doc.querySelector("dest CNPJ")?.textContent || "",
    };

    // Extrair itens
    const detItems = doc.querySelectorAll("det");
    const itens: NFeItem[] = [];

    detItems.forEach((det) => {
      const codigo = det.querySelector("prod cProd")?.textContent || "";
      const descricao = det.querySelector("prod xProd")?.textContent || "";
      const quantidade = parseFloat(
        det.querySelector("prod qCom")?.textContent || "0"
      );
      const valorUnitario = parseFloat(
        det.querySelector("prod vUnCom")?.textContent || "0"
      );
      const valorTotal = parseFloat(
        det.querySelector("prod vProd")?.textContent || "0"
      );

      itens.push({
        codigo,
        descricao,
        quantidade,
        valorUnitario,
        valorTotal,
      });
    });

    return {
      numero,
      dataEmissao,
      valorTotal,
      emitente,
      destinatario,
      itens,
    };
  };

  // Função de comparação
  const compareOrderWithNFe = (nfeData: NFeData): ComparisonResult => {
    if (!orderData) {
      throw new Error("Dados do pedido não disponíveis");
    }

    const detalhes: ComparisonItem[] = [];
    const pedidoItems = orderData.items;
    const nfeItems = nfeData.itens;

    // Criar mapas para lookup eficiente
    const pedidoMap = new Map<string, (typeof pedidoItems)[0]>();
    const nfeMap = new Map<string, NFeItem>();

    // Mapear itens do pedido
    pedidoItems.forEach((item) => {
      pedidoMap.set(item.product_code.toUpperCase(), item);
    });

    // Mapear itens da NFe
    nfeItems.forEach((item) => {
      const codigo = extractProductCode(item.descricao).toUpperCase();
      nfeMap.set(codigo, item);
    });

    // Comparar itens do pedido com a NFe
    pedidoItems.forEach((pedidoItem) => {
      const codigoPedido = pedidoItem.product_code.toUpperCase();
      const nfeItem = nfeMap.get(codigoPedido);

      if (nfeItem) {
        const quantidadePedido = pedidoItem.quantity;
        const quantidadeNota = nfeItem.quantidade;
        const diferenca = quantidadePedido - quantidadeNota;

        let status: ComparisonItem["status"] = "completo";
        if (quantidadeNota === 0) {
          status = "pendente";
        } else if (quantidadeNota < quantidadePedido) {
          status = "parcial";
        }

        detalhes.push({
          codigo: pedidoItem.product_code,
          descricao: pedidoItem.product_name,
          status,
          quantidadePedido,
          quantidadeNota,
          diferenca,
          valorUnitarioPedido: pedidoItem.unit_price,
          valorUnitarioNota: nfeItem.valorUnitario,
        });
      } else {
        // Item do pedido não encontrado na NFe
        detalhes.push({
          codigo: pedidoItem.product_code,
          descricao: pedidoItem.product_name,
          status: "pendente",
          quantidadePedido: pedidoItem.quantity,
          quantidadeNota: 0,
          diferenca: pedidoItem.quantity,
          valorUnitarioPedido: pedidoItem.unit_price,
          valorUnitarioNota: 0,
        });
      }
    });

    // Verificar itens extras na NFe
    nfeItems.forEach((nfeItem) => {
      const codigoNfe = extractProductCode(nfeItem.descricao).toUpperCase();
      const pedidoItem = pedidoMap.get(codigoNfe);

      if (!pedidoItem) {
        detalhes.push({
          codigo: extractProductCode(nfeItem.descricao),
          descricao: nfeItem.descricao,
          status: "extra",
          quantidadePedido: 0,
          quantidadeNota: nfeItem.quantidade,
          diferenca: -nfeItem.quantidade,
          valorUnitarioPedido: 0,
          valorUnitarioNota: nfeItem.valorUnitario,
        });
      }
    });

    // Calcular resumo
    const resumo = {
      totalItensPedido: pedidoItems.length,
      totalItensNota: nfeItems.length,
      itensCompletos: detalhes.filter((d) => d.status === "completo").length,
      itensParciais: detalhes.filter((d) => d.status === "parcial").length,
      itensPendentes: detalhes.filter((d) => d.status === "pendente").length,
      itensExtras: detalhes.filter((d) => d.status === "extra").length,
    };

    return {
      notaFiscal: {
        numero: nfeData.numero,
        dataEmissao: nfeData.dataEmissao,
        valorTotal: nfeData.valorTotal,
        emitente: nfeData.emitente.nome,
        destinatario: nfeData.destinatario.nome,
      },
      resumo,
      detalhes,
    };
  };

  // Manipular seleção de arquivo
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validar tipo de arquivo
      if (!file.name.toLowerCase().endsWith(".xml")) {
        setError("Por favor, selecione um arquivo XML válido");
        return;
      }

      // Validar tamanho (máximo 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError("Arquivo muito grande. Máximo 10MB permitido");
        return;
      }

      setSelectedFile(file);
      setError(null);
    }
  };

  // Processar arquivo XML
  const handleProcessFile = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setError(null);
    setStep("processing");

    try {
      const fileContent = await selectedFile.text();

      // Parse do XML
      const nfeData = parseNFeXML(fileContent);

      // Comparação
      const result = compareOrderWithNFe(nfeData);

      setComparisonResult(result);
      setStep("results");

      toast.success("Comparação realizada com sucesso!");
    } catch (error) {
      console.error("Erro ao processar XML:", error);
      setError(
        error instanceof Error ? error.message : "Erro ao processar arquivo XML"
      );
      setStep("upload");
    } finally {
      setIsProcessing(false);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const files = Array.from(e.dataTransfer.files);
    const xmlFile = files.find((file) =>
      file.name.toLowerCase().endsWith(".xml")
    );

    if (xmlFile) {
      setSelectedFile(xmlFile);
      setError(null);
    } else {
      setError("Por favor, solte um arquivo XML válido");
    }
  };

  // Função para obter cor do status
  const getStatusColor = (status: ComparisonItem["status"]) => {
    switch (status) {
      case "completo":
        return "text-green-600";
      case "parcial":
        return "text-yellow-600";
      case "pendente":
        return "text-red-600";
      case "extra":
        return "text-blue-600";
      default:
        return "text-gray-600";
    }
  };

  // Função para obter ícone do status
  const getStatusIcon = (status: ComparisonItem["status"]) => {
    switch (status) {
      case "completo":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "parcial":
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case "pendente":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "extra":
        return <Info className="h-4 w-4 text-blue-600" />;
      default:
        return null;
    }
  };

  // Função para obter texto do status
  const getStatusText = (status: ComparisonItem["status"]) => {
    switch (status) {
      case "completo":
        return "Completo";
      case "parcial":
        return "Parcial";
      case "pendente":
        return "Pendente";
      case "extra":
        return "Extra";
      default:
        return "Desconhecido";
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("pt-BR");
    } catch {
      return dateString;
    }
  };

  // Função para gerar PDF de relatório de pendências
  const generatePendencyReportPDF = async (
    comparisonData: ComparisonResult
  ) => {
    if (!orderData || !comparisonData) return;

    // Filtrar apenas itens pendentes e parciais
    const pendingItems = comparisonData.detalhes.filter(
      (item) => item.status === "pendente" || item.status === "parcial"
    );

    if (pendingItems.length === 0) {
      toast.info("Não há itens pendentes para exportar");
      return;
    }

    // Criar dados para o PDF no formato OrderPrintTemplate
    const currentUser = SessionManager.getCurrentUser();
    const userName = currentUser?.name || "Usuário não informado";

    // Converter itens pendentes para o formato esperado pelo template
    const pendingItemsForPDF = pendingItems.map((item) => ({
      id: Math.random().toString(36).substr(2, 9),
      product_id: "", // Não necessário para o PDF
      product_code: item.codigo,
      product_name: item.descricao,
      quantity: item.diferenca > 0 ? item.diferenca : item.quantidadePedido, // Quantidade pendente
      unit_price: item.valorUnitarioPedido || 0,
      original_unit_price: item.valorUnitarioPedido || 0,
      discount_percentage: 0,
      discount_name: "",
      commission_percentage: 0,
      client_ref: "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    // Calcular totais apenas dos itens pendentes
    const totalPieces = pendingItemsForPDF.reduce(
      (sum, item) => sum + item.quantity,
      0
    );
    const subtotal = pendingItemsForPDF.reduce(
      (sum, item) => sum + item.quantity * item.unit_price,
      0
    );

    // Estrutura de dados para o PDF
    const printData = {
      orderNumber: orderData.order_number,
      userName: userName,
      orderStatus: "PENDÊNCIAS", // Status especial para o relatório
      client: {
        code: "N/A",
        client: orderData.client_name,
        city: "",
      },
      paymentCondition: {
        id: "",
        name: "Ver pedido original",
        description: "",
        installments: 1,
        is_cash: false,
      },
      items: pendingItemsForPDF,
      notes: `RELATÓRIO DE PENDÊNCIAS - Comparação com Nota Fiscal ${
        comparisonData.notaFiscal.numero
      }

Data da Nota: ${formatDate(comparisonData.notaFiscal.dataEmissao)}
Emitente: ${comparisonData.notaFiscal.emitente}

RESUMO DA COMPARAÇÃO:
• Itens do Pedido: ${comparisonData.resumo.totalItensPedido}
• Itens da Nota: ${comparisonData.resumo.totalItensNota}
• Itens Completos: ${comparisonData.resumo.itensCompletos}
• Itens Parciais: ${comparisonData.resumo.itensParciais}
• Itens Pendentes: ${comparisonData.resumo.itensPendentes}
• Itens Extras: ${comparisonData.resumo.itensExtras}

Os itens listados abaixo representam as PENDÊNCIAS encontradas na comparação.`,
      totals: {
        totalPieces: totalPieces,
        subtotal: subtotal,
        totalCommission: 0,
        shippingRate: 0,
        total: subtotal,
      },
      discounts: [],
    };

    // Gerar HTML personalizado para o relatório de pendências
    const htmlContent = generatePendencyReportHTML(printData, comparisonData);

    // Gerar PDF
    try {
      const html2pdf = (await import("html2pdf.js" as any)).default;

      if (!html2pdf) {
        throw new Error("Biblioteca html2pdf não carregada");
      }

      const clientName = orderData.client_name.replace(/[^a-zA-Z0-9]/g, "_");
      const orderCode = orderData.order_number.replace(/[^a-zA-Z0-9]/g, "_");
      const date = new Date().toISOString().split("T")[0];
      const filename = `PENDENCIA_${clientName}_${orderCode}_${date}.pdf`;

      await html2pdf()
        .set({
          margin: [10, 10, 10, 10],
          filename: filename,
          image: {
            type: "jpeg",
            quality: 0.98,
          },
          html2canvas: {
            scale: 2,
            useCORS: true,
            letterRendering: true,
            logging: false,
          },
          jsPDF: {
            unit: "mm",
            format: "a4",
            orientation: "portrait",
          },
        })
        .from(htmlContent)
        .save();

      toast.success("Relatório de pendências gerado com sucesso!");
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast.error("Erro ao gerar relatório PDF");
    }
  };

  // Função para gerar HTML personalizado do relatório
  const generatePendencyReportHTML = (
    data: any,
    comparisonData: ComparisonResult
  ) => {
    const statusColors = {
      PENDÊNCIAS: "#1F2937", // Cinza escuro neutro
    };

    const statusColor = statusColors["PENDÊNCIAS"];

    return `
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <title>RELATÓRIO DE PENDÊNCIAS - ${data.client.client}</title>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }

            @page {
              size: A4;
              margin: 10mm;
            }

            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              font-size: 11px;
              line-height: 1.6;
              color: #1F2937;
              background: white;
            }

            .container {
              max-width: 100%;
              margin: 0;
              padding: 0;
            }

            .header {
              background: linear-gradient(135deg, ${statusColor} 0%, ${statusColor}dd 100%);
              color: white;
              padding: 20px;
              border-radius: 8px;
              margin-bottom: 20px;
              text-align: center;
            }

            .header h1 {
              font-size: 24px;
              font-weight: 700;
              margin-bottom: 10px;
            }

            .header-info {
              font-size: 14px;
              opacity: 0.95;
            }

            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin-bottom: 20px;
            }

            .info-card {
              background: #F9FAFB;
              border: 2px solid #E5E7EB;
              border-radius: 8px;
              padding: 15px;
            }

            .info-card h3 {
              font-size: 14px;
              font-weight: 600;
              color: #6B7280;
              margin-bottom: 10px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }

            .info-row {
              display: flex;
              justify-content: space-between;
              padding: 5px 0;
              border-bottom: 1px solid #E5E7EB;
            }

            .info-row:last-child {
              border-bottom: none;
            }

            .label {
              font-weight: 500;
              color: #6B7280;
            }

            .value {
              font-weight: 600;
              color: #111827;
            }

            .table-section {
              margin-bottom: 20px;
            }

            .table-header {
              background: #F3F4F6;
              padding: 15px;
              border-radius: 8px 8px 0 0;
              border: 1px solid #E5E7EB;
              border-bottom: none;
            }

            .table-header h3 {
              font-size: 16px;
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

            th {
              padding: 12px 8px;
              text-align: left;
              font-weight: 600;
              font-size: 11px;
              color: #374151;
              background: #F9FAFB;
              border-bottom: 2px solid #E5E7EB;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }

            td {
              padding: 10px 8px;
              border-bottom: 1px solid #F3F4F6;
              font-size: 11px;
            }

            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-mono { font-family: 'Courier New', monospace; }
            .font-bold { font-weight: 600; }

            .notes-section {
              background: #FEF3C7;
              border: 1px solid #FDE68A;
              border-radius: 8px;
              padding: 20px;
              margin: 20px 0;
            }

            .notes-section h3 {
              font-size: 16px;
              font-weight: 600;
              color: #92400E;
              margin-bottom: 15px;
            }

            .notes-content {
              color: #78350F;
              line-height: 1.6;
              white-space: pre-wrap;
            }

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
              font-size: 16px;
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
              padding: 8px 0;
              border-bottom: 1px solid #E5E7EB;
            }

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

            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 2px solid #E5E7EB;
              text-align: center;
              color: #6B7280;
              font-size: 10px;
            }

            .status-badge {
              display: inline-block;
              padding: 4px 8px;
              border-radius: 4px;
              font-size: 10px;
              font-weight: 600;
              margin-left: 8px;
            }

            .status-pendente {
              background: #FEE2E2;
              color: #991B1B;
              border: 1px solid #FECACA;
            }

            .status-parcial {
              background: #FEF3C7;
              color: #92400E;
              border: 1px solid #FDE68A;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>RELATÓRIO DE PENDÊNCIAS</h1>
              <div class="header-info">
                <div><strong>Pedido:</strong> #${data.orderNumber}</div>
                <div><strong>Cliente:</strong> ${data.client.client}</div>
                <div><strong>Data:</strong> ${new Date().toLocaleDateString(
                  "pt-BR"
                )}</div>
                <div><strong>Gerado por:</strong> ${data.userName}</div>
              </div>
            </div>

            <div class="info-grid">
              <div class="info-card">
                <h3>Resumo da Comparação</h3>
                <div class="info-row">
                  <span class="label">Itens Completos:</span>
                  <span class="value">${
                    comparisonData.resumo.itensCompletos
                  }</span>
                </div>
                <div class="info-row">
                  <span class="label">Itens Parciais:</span>
                  <span class="value">${
                    comparisonData.resumo.itensParciais
                  }</span>
                </div>
                <div class="info-row">
                  <span class="label">Itens Pendentes:</span>
                  <span class="value">${
                    comparisonData.resumo.itensPendentes
                  }</span>
                </div>
              </div>

              <div class="info-card">
                <h3>Nota Fiscal</h3>
                <div class="info-row">
                  <span class="label">Número:</span>
                  <span class="value">${comparisonData.notaFiscal.numero}</span>
                </div>
                <div class="info-row">
                  <span class="label">Data:</span>
                  <span class="value">${formatDate(
                    comparisonData.notaFiscal.dataEmissao
                  )}</span>
                </div>
                <div class="info-row">
                  <span class="label">Emitente:</span>
                  <span class="value">${
                    comparisonData.notaFiscal.emitente
                  }</span>
                </div>
              </div>
            </div>

            <div class="table-section">
              <div class="table-header">
                <h3>Itens com Pendências (${data.items.length} itens)</h3>
              </div>
              <table>
                <thead>
                  <tr>
                    <th class="text-center">#</th>
                    <th>Código</th>
                    <th>Descrição</th>
                    <th class="text-center">Qtd Pedido</th>
                    <th class="text-center">Qtd Nota</th>
                    <th class="text-center">Pendente</th>
                    <th class="text-right">Preço Unit. Pedido</th>
                    <th class="text-right">Preço Unit. Nota</th>
                    <th class="text-right">Valor Pendência</th>
                    <th class="text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${comparisonData.detalhes
                    .filter(
                      (item) =>
                        item.status === "pendente" || item.status === "parcial"
                    )
                    .map((item, index) => {
                      const quantidadePendente =
                        item.diferenca > 0
                          ? item.diferenca
                          : item.quantidadePedido;
                      const valorPendencia =
                        quantidadePendente * (item.valorUnitarioPedido || 0);
                      const precoUnitPedido = item.valorUnitarioPedido || 0;
                      const precoUnitNota = item.valorUnitarioNota || 0;
                      const temDiferencaPreco =
                        precoUnitPedido !== precoUnitNota && precoUnitNota > 0;

                      return `
                      <tr>
                        <td class="text-center font-bold">${index + 1}</td>
                        <td class="font-mono">${item.codigo}</td>
                        <td>${item.descricao}</td>
                        <td class="text-center">${item.quantidadePedido}</td>
                        <td class="text-center">${item.quantidadeNota}</td>
                        <td class="text-center font-bold" style="color: #EF4444;">${
                          item.diferenca
                        }</td>
                        <td class="text-right font-mono">
                          ${formatCurrency(precoUnitPedido)}
                          ${
                            temDiferencaPreco
                              ? '<div style="font-size: 9px; color: #92400E;">⚠️ Diferença</div>'
                              : ""
                          }
                        </td>
                        <td class="text-right font-mono">
                          ${
                            precoUnitNota > 0
                              ? formatCurrency(precoUnitNota)
                              : "-"
                          }
                        </td>
                        <td class="text-right font-mono font-bold" style="color: #EF4444;">
                          ${formatCurrency(valorPendencia)}
                        </td>
                        <td class="text-center">
                          <span class="status-badge ${
                            item.status === "pendente"
                              ? "status-pendente"
                              : "status-parcial"
                          }">
                            ${
                              item.status === "pendente"
                                ? "PENDENTE"
                                : "PARCIAL"
                            }
                          </span>
                        </td>
                      </tr>
                      `;
                    })
                    .join("")}
                </tbody>
              </table>
            </div>

            <div class="notes-section">
              <h3>Observações</h3>
              <div class="notes-content">${data.notes}</div>
            </div>

            <div class="totals-container">
              <div class="totals-card">
                <h3>Totais das Pendências</h3>
                <div class="total-row">
                  <span class="total-label">Total de Peças Pendentes:</span>
                  <span class="total-value">${formatNumber(
                    data.totals.totalPieces
                  )}</span>
                </div>
                <div class="total-row">
                  <span class="total-label">Valor das Pendências:</span>
                  <span class="total-value">${formatCurrency(
                    data.totals.subtotal
                  )}</span>
                </div>
                <div class="total-row total-final">
                  <span class="total-label">TOTAL PENDENTE:</span>
                  <span class="total-value">${formatCurrency(
                    data.totals.total
                  )}</span>
                </div>
              </div>
            </div>

            <div class="footer">
              <p>Relatório gerado por ${
                data.userName
              } em ${new Date().toLocaleString("pt-BR")}</p>
              <p><strong>SGP - Sistema de Gestão de Pedidos</strong></p>
            </div>
          </div>
        </body>
      </html>
    `;
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("pt-BR").format(value);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={`
        ${
          isMobile
            ? "w-[95vw] max-w-[95vw] h-[95vh] max-h-[95vh] m-2"
            : "max-w-6xl max-h-[90vh]"
        }
        overflow-y-auto
      `}
      >
        <DialogHeader className={isMobile ? "pb-2" : ""}>
          <DialogTitle
            className={`flex items-center gap-2 ${isMobile ? "text-lg" : ""}`}
          >
            <FileCheck className="h-5 w-5" />
            Comparar com XML da Nota Fiscal
          </DialogTitle>
          <DialogDescription className="text-sm">
            Pedido #{orderData?.order_number} - {orderData?.client_name}
          </DialogDescription>
        </DialogHeader>

        {/* Etapa 1: Upload do arquivo */}
        {step === "upload" && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Upload do XML da Nota Fiscal
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors"
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                >
                  <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-medium text-gray-700 mb-2">
                    Arraste o arquivo XML aqui ou clique para selecionar
                  </p>
                  <p className="text-sm text-gray-500 mb-4">
                    Apenas arquivos XML da NFe são aceitos (máximo 10MB)
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="mb-2"
                  >
                    Selecionar Arquivo
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xml"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>

                {selectedFile && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-green-800">
                          {selectedFile.name}
                        </p>
                        <p className="text-sm text-green-600">
                          {(selectedFile.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedFile(null);
                          setError(null);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {error && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button
                onClick={handleProcessFile}
                disabled={!selectedFile || isProcessing}
              >
                {isProcessing ? "Processando..." : "Analisar XML"}
              </Button>
            </div>
          </div>
        )}

        {/* Etapa 2: Processamento */}
        {step === "processing" && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mb-4"></div>
            <p className="text-lg font-medium">Processando XML...</p>
            <p className="text-sm text-gray-600">
              Comparando com dados do pedido
            </p>
          </div>
        )}

        {/* Etapa 3: Resultados */}
        {step === "results" && comparisonResult && (
          <div className="space-y-6">
            {/* Informações da Nota Fiscal */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Informações da Nota Fiscal
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Número da Nota</p>
                    <p className="font-medium">
                      {comparisonResult.notaFiscal.numero}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Data de Emissão</p>
                    <p className="font-medium">
                      {formatDate(comparisonResult.notaFiscal.dataEmissao)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Valor Total</p>
                    <p className="font-medium">
                      {formatCurrency(comparisonResult.notaFiscal.valorTotal)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Emitente</p>
                    <p className="font-medium">
                      {comparisonResult.notaFiscal.emitente}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Resumo da Comparação */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Resumo da Comparação</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {comparisonResult.resumo.itensCompletos}
                    </div>
                    <p className="text-sm text-gray-600">Completos</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">
                      {comparisonResult.resumo.itensParciais}
                    </div>
                    <p className="text-sm text-gray-600">Parciais</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {comparisonResult.resumo.itensPendentes}
                    </div>
                    <p className="text-sm text-gray-600">Pendentes</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {comparisonResult.resumo.itensExtras}
                    </div>
                    <p className="text-sm text-gray-600">Extras</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Detalhes da Comparação */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Detalhes por Item</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[100px]">Código</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead className="text-center w-[80px]">
                          Pedido
                        </TableHead>
                        <TableHead className="text-center w-[80px]">
                          Nota
                        </TableHead>
                        <TableHead className="text-center w-[80px]">
                          Diferença
                        </TableHead>
                        <TableHead className="text-center w-[120px]">
                          Status
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {comparisonResult.detalhes.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-mono text-sm">
                            {item.codigo}
                          </TableCell>
                          <TableCell className="text-sm">
                            {item.descricao}
                          </TableCell>
                          <TableCell className="text-center">
                            {item.quantidadePedido}
                          </TableCell>
                          <TableCell className="text-center">
                            {item.quantidadeNota}
                          </TableCell>
                          <TableCell className="text-center">
                            <span
                              className={
                                item.diferenca > 0
                                  ? "text-red-600"
                                  : item.diferenca < 0
                                  ? "text-blue-600"
                                  : "text-green-600"
                              }
                            >
                              {item.diferenca > 0 ? "+" : ""}
                              {item.diferenca}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-2">
                              {getStatusIcon(item.status)}
                              <span
                                className={`text-sm ${getStatusColor(
                                  item.status
                                )}`}
                              >
                                {getStatusText(item.status)}
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={onClose}>
                Fechar
              </Button>
              <Button
                onClick={() => generatePendencyReportPDF(comparisonResult)}
                disabled={!comparisonResult}
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar Relatório
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
