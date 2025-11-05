"use client";

import type React from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  AlertCircle,
  CheckCircle,
  Download,
  FileText,
  Info,
  Upload,
  Zap,
} from "lucide-react";
import { useRef, useState } from "react";

interface ImportStrategy {
  value: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  recommended?: boolean;
}

interface ImportResult {
  total: number;
  success: number;
  errors: string[];
  statistics?: {
    totalProcessed: number;
    inserted: number;
    updated: number;
    errors: number;
  };
  strategy?: string;
}

const importStrategies: ImportStrategy[] = [
  {
    value: "auto",
    label: "Automático (Recomendado)",
    description: "Atualiza produtos existentes por referência, insere novos",
    icon: <Zap className="h-4 w-4" />,
    recommended: true,
  },
  {
    value: "upsert_by_name",
    label: "UPSERT por Referência",
    description:
      "Atualiza se produto existe, insere se é novo (baseado na referência)",
    icon: <CheckCircle className="h-4 w-4" />,
  },
  {
    value: "upsert_by_id",
    label: "UPSERT por ID",
    description:
      "Atualiza registros existentes baseado no ID (requer ID nos dados)",
    icon: <FileText className="h-4 w-4" />,
  },
  {
    value: "insert_only",
    label: "Apenas Inserir",
    description: "Insere todos como novos registros (pode gerar duplicatas)",
    icon: <Upload className="h-4 w-4" />,
  },
];

export function ProductSmartImport() {
  const [file, setFile] = useState<File | null>(null);
  const [textData, setTextData] = useState("");
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [strategy, setStrategy] = useState("auto");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Função para tentar decodificar o arquivo em diferentes codificações
  const decodeFileContent = async (buffer: ArrayBuffer): Promise<string> => {
    try {
      // Tenta primeiro UTF-8
      const utf8Content = new TextDecoder("utf-8").decode(buffer);

      // Verifica se o conteúdo UTF-8 parece válido (não tem caracteres estranhos)
      if (!utf8Content.includes("")) {
        return utf8Content;
      }

      // Se UTF-8 falhou, tenta ANSI (windows-1252)
      const ansiContent = new TextDecoder("windows-1252").decode(buffer);
      return ansiContent;
    } catch (error) {
      console.error("Erro ao decodificar arquivo:", error);
      throw new Error(
        "Não foi possível ler o arquivo. Tente converter para UTF-8."
      );
    }
  };

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) {
      return;
    }

    // Verificar extensão do arquivo
    const fileName = selectedFile.name.toLowerCase();
    const isValidExtension =
      fileName.endsWith(".txt") || fileName.endsWith(".csv");

    if (!isValidExtension) {
      toast({
        title: "Arquivo inválido",
        description:
          "Por favor, selecione um arquivo com extensão .CSV ou .TXT",
        variant: "destructive",
      });
      return;
    }

    // Aumentando o limite para 50MB
    if (selectedFile.size > 50 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "O arquivo não pode ser maior que 50MB.",
        variant: "destructive",
      });
      return;
    }

    setFile(selectedFile);
    setResult(null);
    setPreview([]);
    setShowPreview(false);

    try {
      const buffer = await selectedFile.arrayBuffer();
      const content = await decodeFileContent(buffer);

      // Verificar se o conteúdo está vazio
      if (!content.trim()) {
        toast({
          title: "Arquivo vazio",
          description: "O arquivo selecionado está vazio.",
          variant: "destructive",
        });
        return;
      }

      // Verificar se tem o formato esperado (pelo menos uma linha com separadores)
      const firstLine = content.split("\n")[0];
      if (!firstLine.includes(";") && !firstLine.includes(",")) {
        toast({
          title: "Formato inválido",
          description:
            "O arquivo deve conter dados separados por vírgula ou ponto e vírgula.",
          variant: "destructive",
        });
        return;
      }

      const lines = content.split("\n").filter((line) => line.trim());

      // Processar apenas as primeiras linhas para preview
      setTextData(content);
      processPreview(content);

      toast({
        title: "Arquivo carregado com sucesso",
        description: `Total de ${lines.length.toLocaleString()} linhas encontradas.`,
      });
    } catch (error) {
      console.error("Erro ao processar arquivo:", error);
      toast({
        title: "Erro na leitura",
        description:
          error instanceof Error ? error.message : "Erro ao ler o arquivo.",
        variant: "destructive",
      });
    }
  };

  const processPreview = (text: string) => {
    try {
      const lines = text.split("\n").filter((line) => line.trim());

      const previewData = lines.slice(0, 10).map((line, index) => {
        const parts = line.split(detectSeparator(text));

        // Limpar e processar o código do produto
        const productCode = parts[0]?.trim().replace(/"/g, "");
        const cleanProductCode = productCode
          .replace(/\s*\([^)]*\)/g, "") // Remove parênteses e seu conteúdo
          .replace(/\s+.*$/, "") // Remove tudo após o primeiro espaço
          .replace(/\.$/, ""); // Remove ponto final se existir

        return {
          linha: index + 1,
          id: parts[4]?.trim().replace(/"/g, "") || null, // ID se fornecido
          product: productCode || "",
          stock: parts[1]?.trim().replace(/"/g, "") || "0",
          price:
            parts[2]
              ?.trim()
              .replace(/"/g, "")
              .replace(",", ".")
              .replace(/;$/, "") || "0",
          application: parts[3]?.trim().replace(/"/g, "") || "",
          cleanCode: cleanProductCode,
          hasId: !!parts[4]?.trim(),
        };
      });
      setPreview(previewData);
    } catch (error) {
      console.error("Erro ao processar preview:", error);
    }
  };

  const detectSeparator = (text: string): ";" | "," => {
    const firstLine = text.split("\n")[0] || "";
    const semicolonCount = (firstLine.match(/;/g) || []).length;
    const commaCount = (firstLine.match(/,/g) || []).length;

    return semicolonCount >= commaCount ? ";" : ",";
  };

  const parseCSVData = (text: string): any[] => {
    const lines = text.split("\n").filter((line) => line.trim());
    const actualSeparator = detectSeparator(text);

    return lines.map((line, index) => {
      const parts = line.split(actualSeparator);

      // Limpar e processar o código do produto
      const productCode = parts[0]?.trim().replace(/"/g, "") || "";
      const cleanProductCode = productCode
        .replace(/\s*\([^)]*\)/g, "") // Remove parênteses e seu conteúdo
        .replace(/\s+.*$/, "") // Remove tudo após o primeiro espaço
        .replace(/\.$/, ""); // Remove ponto final se existir

      // Processar preço: remover ponto e vírgula do final e converter
      const price =
        parts[2]
          ?.trim()
          .replace(/"/g, "")
          .replace(",", ".")
          .replace(/;$/, "") || "0";

      const result: any = {
        product: productCode,
        stock: parts[1]?.trim().replace(/"/g, "") || "0",
        price: price,
        application: parts[3]?.trim().replace(/"/g, "") || "",
        cleanCode: cleanProductCode,
      };

      // Incluir ID se fornecido
      const id = parts[4]?.trim().replace(/"/g, "");
      if (id) {
        result.id = id;
      }

      return result;
    });
  };

  const importProducts = async () => {
    if (!textData.trim()) {
      toast({
        title: "Dados vazios",
        description: "Por favor, selecione um arquivo ou cole os dados.",
        variant: "destructive",
      });
      return;
    }

    setImporting(true);
    setProgress(0);
    setResult(null);

    try {
      const rows = parseCSVData(textData);
      setProgress(25);

      // Preparar dados para a API
      const products = rows.map((row) => ({
        ...(row.id && { id: row.id }),
        product: row.product.trim(),
        stock: Math.min(Number.parseInt(row.stock) || 0, 2147483647),
        price: Math.min(Number.parseFloat(row.price) || 0.0, 99999999.99),
        application: row.application || null,
      }));

      setProgress(50);

      // Chamar nova API de importação inteligente
      const response = await fetch("/api/products/smart-import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          products: products,
          strategy: strategy,
        }),
      });

      setProgress(75);

      if (response.ok) {
        const apiResult = await response.json();

        setResult({
          total: rows.length,
          success: apiResult.statistics?.totalProcessed || 0,
          errors: apiResult.errors || [],
          statistics: apiResult.statistics,
          strategy: apiResult.strategy,
        });

        toast({
          title: "Importação concluída",
          description: `${apiResult.statistics?.inserted || 0} inseridos, ${
            apiResult.statistics?.updated || 0
          } atualizados`,
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro na importação");
      }
    } catch (error) {
      console.error("Erro na importação:", error);
      toast({
        title: "Erro na importação",
        description: `Erro ao processar os dados: ${error}`,
        variant: "destructive",
      });
    } finally {
      setImporting(false);
      setProgress(100);
    }
  };

  const downloadTemplate = () => {
    const template = `PRODUTO;ESTOQUE;PREÇO;APLICAÇÃO;ID(OPCIONAL)
PARAFUSO M6;100;1.50;Motor 1.0;
PORCA M6;50;0.75;Fixação geral;123
ARRUELA LISA;200;0.25;Uso geral;`;

    const blob = new Blob([template], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "template-produtos-inteligente.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Importação Inteligente de Produtos
        </CardTitle>
        <CardDescription>
          Sistema avançado que detecta automaticamente se deve inserir novos
          produtos ou atualizar existentes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Seleção de Estratégia */}
        <div className="space-y-3">
          <Label htmlFor="strategy">Estratégia de Importação</Label>
          <Select value={strategy} onValueChange={setStrategy}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione a estratégia" />
            </SelectTrigger>
            <SelectContent>
              {importStrategies.map((strat) => (
                <SelectItem key={strat.value} value={strat.value}>
                  <div className="flex items-center gap-2">
                    {strat.icon}
                    <div>
                      <div className="font-medium flex items-center gap-1">
                        {strat.label}
                        {strat.recommended && (
                          <span className="text-xs bg-green-100 text-green-700 px-1 rounded">
                            Recomendado
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        {strat.description}
                      </div>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-600">
            Suporta CSV/TXT com detecção automática de formato
          </p>
          <Button variant="outline" size="sm" onClick={downloadTemplate}>
            <Download className="h-4 w-4 mr-2" />
            Baixar Template
          </Button>
        </div>

        <div>
          <Label htmlFor="csv-file">Arquivo CSV/TXT</Label>
          <Input
            id="csv-file"
            type="file"
            accept=".csv,.txt"
            onChange={handleFileSelect}
            ref={fileInputRef}
            disabled={importing}
          />
        </div>

        {preview.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
              >
                {showPreview ? "Ocultar" : "Mostrar"} Preview ({preview.length}{" "}
                primeiras linhas)
              </Button>
              <div className="text-xs text-gray-500">
                {preview.some((p) => p.hasId)
                  ? "✅ IDs detectados"
                  : "ℹ️ Sem IDs (usará UPSERT por nome)"}
              </div>
            </div>

            {showPreview && (
              <div className="border rounded-lg overflow-auto max-h-64">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-2 text-left">Linha</th>
                      <th className="p-2 text-left">Produto</th>
                      <th className="p-2 text-left">Estoque</th>
                      <th className="p-2 text-left">Preço</th>
                      <th className="p-2 text-left">Aplicação</th>
                      {preview.some((p) => p.hasId) && (
                        <th className="p-2 text-left">ID</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, index) => (
                      <tr key={index} className="border-t">
                        <td className="p-2">{row.linha}</td>
                        <td className="p-2 font-mono">{row.product}</td>
                        <td className="p-2">{row.stock}</td>
                        <td className="p-2">R$ {row.price}</td>
                        <td
                          className="p-2 truncate max-w-32"
                          title={row.application}
                        >
                          {row.application}
                        </td>
                        {preview.some((p) => p.hasId) && (
                          <td className="p-2">{row.id || "-"}</td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {importing && (
          <div className="space-y-2">
            <Progress value={progress} className="w-full" />
            <p className="text-sm text-center text-gray-600">
              Importando produtos... {progress}%
            </p>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            onClick={importProducts}
            disabled={!textData.trim() || importing}
            className="flex-1"
          >
            {importing ? (
              <>Importando...</>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Importar Produtos
              </>
            )}
          </Button>
        </div>

        {result && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {result.statistics && (
                <>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {result.statistics.inserted}
                    </div>
                    <div className="text-xs text-green-700">Inseridos</div>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {result.statistics.updated}
                    </div>
                    <div className="text-xs text-blue-700">Atualizados</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-600">
                      {result.statistics.totalProcessed}
                    </div>
                    <div className="text-xs text-gray-700">Total</div>
                  </div>
                  <div className="text-center p-3 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">
                      {result.statistics.errors}
                    </div>
                    <div className="text-xs text-red-700">Erros</div>
                  </div>
                </>
              )}
            </div>

            {result.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <details>
                    <summary className="font-medium cursor-pointer">
                      {result.errors.length} erro(s) encontrado(s) - clique para
                      ver detalhes
                    </summary>
                    <ul className="mt-2 text-sm space-y-1">
                      {result.errors.slice(0, 10).map((error, index) => (
                        <li key={index} className="list-disc list-inside">
                          {error}
                        </li>
                      ))}
                      {result.errors.length > 10 && (
                        <li className="text-gray-500">
                          ... e mais {result.errors.length - 10} erros
                        </li>
                      )}
                    </ul>
                  </details>
                </AlertDescription>
              </Alert>
            )}

            {result.strategy && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Estratégia utilizada:</strong> {result.strategy}
                  {result.statistics && (
                    <div className="mt-1 text-sm">
                      Processados: {result.statistics.totalProcessed} | Novos:{" "}
                      {result.statistics.inserted} | Atualizados:{" "}
                      {result.statistics.updated}
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
