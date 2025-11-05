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
import { Checkbox } from "@/components/ui/checkbox";
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
import { useUsers } from "@/modules/auth/presentation/hooks/useUsers";
import {
  AlertCircle,
  CheckCircle,
  Copy,
  Download,
  FileText,
  Upload,
  Users,
  X,
} from "lucide-react";
import { useRef, useState } from "react";

interface ImportResult {
  total: number;
  success: number;
  errors: string[];
  preview?: any[];
  inserted?: number;
  updated?: number;
  unchanged?: number;
  updateDetails?: Array<{
    code: string;
    changes: string[];
  }>;
  errorDetails?: {
    duplicateCodes: { line: number; code: string }[];
    duplicateCnpjs: { line: number; cnpj: string }[];
    otherErrors: { line: number; error: string }[];
  };
}

export function ClientCSVImport() {
  const [file, setFile] = useState<File | null>(null);
  const [textData, setTextData] = useState("");
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [allowUpdates, setAllowUpdates] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { data: users = [], isLoading: loadingUsers } = useUsers();

  // Função para tentar decodificar o arquivo em diferentes codificações
  const decodeFileContent = async (buffer: ArrayBuffer): Promise<string> => {
    try {
      // Tenta primeiro UTF-8
      const utf8Content = new TextDecoder("utf-8").decode(buffer);

      // Verifica se o conteúdo UTF-8 parece válido (não tem caracteres estranhos)
      if (!utf8Content.includes("�")) {
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

        return {
          linha: index + 1,
          code: parts[0]?.trim().replace(/"/g, "") || "",
          client: parts[1]?.trim().replace(/"/g, "") || "",
          city: parts[2]?.trim().replace(/"/g, "") || "",
          cnpj: parts[3]?.trim().replace(/"/g, "").replace(/[^\d]/g, "") || "", // Remove caracteres não numéricos
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

      return {
        code: parts[0]?.trim().replace(/"/g, "") || "",
        client: parts[1]?.trim().replace(/"/g, "") || "",
        city: parts[2]?.trim().replace(/"/g, "") || "",
        cnpj: parts[3]?.trim().replace(/"/g, "").replace(/[^\d]/g, "") || "", // Remove caracteres não numéricos
      };
    });
  };

  const validateRow = (row: any, index: number): string | null => {
    // Validar código do cliente
    if (!row.code || row.code.trim() === "") {
      return `Linha ${index + 1}: Código do cliente é obrigatório`;
    }

    if (row.code.length > 20) {
      return `Linha ${
        index + 1
      }: Código do cliente não pode exceder 20 caracteres`;
    }

    // Validar nome do cliente
    if (!row.client || row.client.trim() === "") {
      return `Linha ${index + 1}: Nome do cliente é obrigatório`;
    }

    if (row.client.length > 255) {
      return `Linha ${
        index + 1
      }: Nome do cliente não pode exceder 255 caracteres`;
    }

    // Validar cidade
    if (!row.city || row.city.trim() === "") {
      return `Linha ${index + 1}: Cidade é obrigatória`;
    }

    if (row.city.length > 100) {
      return `Linha ${index + 1}: Cidade não pode exceder 100 caracteres`;
    }

    // Validar CNPJ (opcional, permite qualquer tamanho)
    if (row.cnpj && row.cnpj.length > 0) {
      // Se tem 14 dígitos, verifica se não são todos iguais
      if (row.cnpj.length === 14 && /^(\d)\1{13}$/.test(row.cnpj)) {
        return `Linha ${index + 1}: CNPJ inválido (dígitos repetidos)`;
      }

      // Se tem mais de 14 dígitos, rejeita
      if (row.cnpj.length > 14) {
        return `Linha ${index + 1}: CNPJ não pode ter mais de 14 dígitos`;
      }
    }

    return null;
  };

  const importClients = async () => {
    if (!textData.trim()) {
      toast({
        title: "Dados vazios",
        description: "Por favor, selecione um arquivo ou cole os dados.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedUserId) {
      toast({
        title: "Usuário não selecionado",
        description:
          "Por favor, selecione um usuário para vincular os clientes.",
        variant: "destructive",
      });
      return;
    }

    setImporting(true);
    setProgress(0);
    setResult(null);

    try {
      const rows = parseCSVData(textData);
      const errors: string[] = [];
      const validRows: any[] = [];
      let processedCount = 0;
      const errorDetails = {
        duplicateCodes: [] as { line: number; code: string }[],
        duplicateCnpjs: [] as { line: number; cnpj: string }[],
        otherErrors: [] as { line: number; error: string }[],
      };

      // Validar dados
      const seenCodes = new Set<string>();
      const seenCnpjs = new Set<string>();

      for (const row of rows) {
        const error = validateRow(row, processedCount);
        let hasError = false;

        if (error) {
          errors.push(error);
          errorDetails.otherErrors.push({
            line: processedCount + 1,
            error: error,
          });
          hasError = true;
        }

        // Verificar duplicatas no arquivo
        if (seenCodes.has(row.code)) {
          errors.push(
            `Linha ${processedCount + 1}: Código '${
              row.code
            }' duplicado no arquivo`
          );
          errorDetails.duplicateCodes.push({
            line: processedCount + 1,
            code: row.code,
          });
          hasError = true;
        } else {
          seenCodes.add(row.code);
        }

        if (row.cnpj && seenCnpjs.has(row.cnpj)) {
          errors.push(
            `Linha ${processedCount + 1}: CNPJ '${
              row.cnpj
            }' duplicado no arquivo`
          );
          errorDetails.duplicateCnpjs.push({
            line: processedCount + 1,
            cnpj: row.cnpj,
          });
          hasError = true;
        } else if (row.cnpj) {
          seenCnpjs.add(row.cnpj);
        }

        if (!hasError) {
          validRows.push({
            code: row.code.trim(),
            client: row.client.trim(),
            city: row.city.trim(),
            cnpj: row.cnpj || null,
            user_id: selectedUserId,
          });
        }

        processedCount++;

        if (processedCount % 100 === 0) {
          setProgress(Math.round((processedCount / rows.length) * 50));
        }
      }

      if (errors.length > 0 && validRows.length === 0) {
        setResult({ total: rows.length, success: 0, errors, errorDetails });
        return;
      }

      // Importar em lotes maiores para arquivos grandes
      const batchSize = 1000;
      let successCount = 0;
      let totalInserted = 0;
      let totalUpdated = 0;
      let totalUnchanged = 0;
      const allUpdateDetails: Array<{ code: string; changes: string[] }> = [];

      for (let i = 0; i < validRows.length; i += batchSize) {
        const batch = validRows.slice(i, i + batchSize);

        try {
          const response = await fetch("/api/clients/import", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ clients: batch, allowUpdates }),
          });

          if (response.ok) {
            const result = await response.json();
            successCount += result.count || batch.length;
            totalInserted += result.inserted || 0;
            totalUpdated += result.updated || 0;
            totalUnchanged += result.unchanged || 0;
            if (result.updateDetails) {
              allUpdateDetails.push(...result.updateDetails);
            }
          } else {
            const errorData = await response.json();
            errors.push(
              `Lote ${Math.floor(i / batchSize) + 1}: ${errorData.error}`
            );
          }
        } catch (error) {
          errors.push(`Lote ${Math.floor(i / batchSize) + 1}: Erro de conexão`);
        }

        // Atualizar progresso da importação (50-100%)
        setProgress(50 + Math.round(((i + batchSize) / validRows.length) * 50));
      }

      setResult({
        total: rows.length,
        success: successCount,
        errors,
        errorDetails,
        inserted: totalInserted,
        updated: totalUpdated,
        unchanged: totalUnchanged,
        updateDetails: allUpdateDetails,
      });

      toast({
        title: "Importação concluída",
        description: `${successCount.toLocaleString()} clientes importados com sucesso.`,
      });
    } catch (error) {
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
    const actualSeparator = textData
      ? detectSeparator(textData)
      : (";" as const);
    const templates = {
      ";": `001;CLIENTE EXEMPLO LTDA;SAO PAULO;12345678000195
002;EMPRESA TESTE SA;RIO DE JANEIRO;98765432000142
003;COMERCIO ABC;BELO HORIZONTE;11122233000166`,
      ",": `"001","CLIENTE EXEMPLO LTDA","SAO PAULO","12345678000195"
"002","EMPRESA TESTE SA","RIO DE JANEIRO","98765432000142"
"003","COMERCIO ABC","BELO HORIZONTE","11122233000166"`,
    } as const;

    const template = templates[actualSeparator];
    const extension = actualSeparator === "," ? "csv" : "txt";
    const mimeType = actualSeparator === "," ? "text/csv" : "text/plain";

    const blob = new Blob([template], { type: `${mimeType};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `template-clientes.${extension}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(textData);
      toast({
        title: "Copiado!",
        description: "Dados copiados para a área de transferência.",
      });
    } catch (error) {
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar os dados.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Importar Clientes
        </CardTitle>
        <CardDescription>
          Importe clientes em massa usando arquivos CSV ou TXT. Formato:
          Código;Nome;Cidade;CNPJ
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-600">
            Importe clientes no formato CSV/TXT
          </p>
          <Button variant="outline" size="sm" onClick={downloadTemplate}>
            <Download className="h-4 w-4 mr-2" />
            Baixar Template
          </Button>
        </div>

        {/* Seletor de usuário */}
        <div>
          <Label htmlFor="user-select" className="flex mb-2 items-center gap-2">
            <Users className="h-4 w-4" />
            Usuário responsável pelos clientes
          </Label>
          <Select
            value={selectedUserId}
            onValueChange={setSelectedUserId}
            disabled={importing || loadingUsers}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione um usuário..." />
            </SelectTrigger>
            <SelectContent>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name} {user.is_admin && "(Admin)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!selectedUserId && (
            <p className="text-sm text-amber-600 mt-1">
              ⚠️ Selecione um usuário para vincular os clientes importados
            </p>
          )}
        </div>

        {/* Checkbox para permitir atualizações */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="allow-updates"
            checked={allowUpdates}
            onCheckedChange={(checked) => setAllowUpdates(checked as boolean)}
            disabled={importing}
          />
          <Label htmlFor="allow-updates" className="text-sm font-medium">
            Permitir atualização de clientes existentes
          </Label>
        </div>
        {allowUpdates && (
          <p className="text-sm text-blue-600 ml-6">
            ℹ️ Clientes com códigos existentes serão atualizados se houver diferenças nos campos
          </p>
        )}

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
              <Button variant="ghost" size="sm" onClick={copyToClipboard}>
                <Copy className="h-4 w-4 mr-2" />
                Copiar Dados
              </Button>
            </div>

            {showPreview && (
              <div className="border rounded p-3 bg-gray-50 text-sm">
                <div className="font-semibold mb-2">
                  <span>Preview dos dados:</span>
                </div>
                {preview.map((item, index) => (
                  <div key={index} className="mb-1 font-mono text-xs">
                    <strong>Linha {item.linha}:</strong>
                    <span className="text-blue-600">{item.code}</span> |
                    Cliente: <span>{item.client}</span> | Cidade:{" "}
                    <span>{item.city}</span> | CNPJ:{" "}
                    <span>{item.cnpj || "N/A"}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {importing && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Importando clientes...</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} />
          </div>
        )}

        {result && (
          <Alert
            className={
              result.errors.length > 0
                ? "border-yellow-500"
                : "border-green-500"
            }
          >
            {result.errors.length > 0 ? (
              <AlertCircle className="h-4 w-4" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            <AlertDescription>
              <div className="space-y-2">
                <p>
                  <strong>Total de linhas:</strong>{" "}
                  {result.total.toLocaleString()} <br />
                  <strong>Processados com sucesso:</strong>{" "}
                  {result.success.toLocaleString()} <br />
                  {result.inserted !== undefined && (
                    <>
                      <strong>Novos clientes inseridos:</strong>{" "}
                      {result.inserted.toLocaleString()} <br />
                    </>
                  )}
                  {result.updated !== undefined && result.updated > 0 && (
                    <>
                      <strong>Clientes atualizados:</strong>{" "}
                      {result.updated.toLocaleString()} <br />
                    </>
                  )}
                  {result.unchanged !== undefined && result.unchanged > 0 && (
                    <>
                      <strong>Sem alterações:</strong>{" "}
                      {result.unchanged.toLocaleString()} <br />
                    </>
                  )}
                  <strong>Erros:</strong>{" "}
                  {result.errors.length.toLocaleString()}
                </p>
                
                {/* Detalhes das atualizações */}
                {result.updateDetails && result.updateDetails.length > 0 && (
                  <details>
                    <summary className="cursor-pointer font-semibold text-sm text-blue-700">
                      Ver detalhes das atualizações ({result.updateDetails.length})
                    </summary>
                    <div className="mt-2 space-y-2 text-sm max-h-60 overflow-y-auto bg-blue-50 p-3 rounded">
                      {result.updateDetails.map((detail, idx) => (
                        <div key={idx} className="text-blue-800">
                          <strong>Cliente {detail.code}:</strong>
                          <ul className="ml-4 mt-1">
                            {detail.changes.map((change, changeIdx) => (
                              <li key={changeIdx} className="text-xs">• {change}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </details>
                )}

                {result.errors.length > 0 && result.errorDetails && (
                  <>
                    {result.errorDetails.duplicateCodes.length > 0 && (
                      <details>
                        <summary className="cursor-pointer font-semibold text-sm">
                          Ver códigos duplicados (
                          {result.errorDetails.duplicateCodes.length})
                        </summary>
                        <div className="mt-2 space-y-1 text-sm max-h-40 overflow-y-auto">
                          {result.errorDetails.duplicateCodes.map(
                            (error, idx) => (
                              <div key={idx} className="text-red-600">
                                • Linha {error.line}: {error.code}
                              </div>
                            )
                          )}
                        </div>
                      </details>
                    )}

                    {result.errorDetails.duplicateCnpjs.length > 0 && (
                      <details>
                        <summary className="cursor-pointer font-semibold text-sm">
                          Ver CNPJs duplicados (
                          {result.errorDetails.duplicateCnpjs.length})
                        </summary>
                        <div className="mt-2 space-y-1 text-sm max-h-40 overflow-y-auto">
                          {result.errorDetails.duplicateCnpjs.map(
                            (error, idx) => (
                              <div key={idx} className="text-red-600">
                                • Linha {error.line}: {error.cnpj}
                              </div>
                            )
                          )}
                        </div>
                      </details>
                    )}

                    <details>
                      <summary className="cursor-pointer font-semibold text-sm">
                        Ver outros erros (
                        {result.errorDetails.otherErrors.length})
                      </summary>
                      <ul className="mt-2 space-y-1 text-sm max-h-40 overflow-y-auto">
                        {result.errorDetails.otherErrors.map((error, idx) => (
                          <li key={idx} className="text-red-600">
                            • Linha {error.line}: {error.error}
                          </li>
                        ))}
                      </ul>
                    </details>

                    <div className="mt-4 text-sm">
                      <p className="font-semibold">Sugestões para correção:</p>
                      <ul className="list-disc pl-4 space-y-1 text-sm">
                        <li>
                          Verifique se não há códigos de clientes duplicados
                        </li>
                        <li>
                          CNPJs podem ter qualquer quantidade de dígitos (até 14
                          máximo, apenas números)
                        </li>
                        <li>
                          Verifique se todos os campos obrigatórios estão
                          preenchidos
                        </li>
                        <li>Formato esperado: Código;Nome;Cidade;CNPJ</li>
                      </ul>
                    </div>
                  </>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {file && (
          <Alert>
            <FileText className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>
                Arquivo selecionado: {file.name} (
                {(file.size / 1024 / 1024).toFixed(2)} MB)
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFile(null);
                  setTextData("");
                  setResult(null);
                  setPreview([]);
                  setShowPreview(false);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                  }
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2">
          <Button
            onClick={importClients}
            disabled={!textData.trim() || !selectedUserId || importing}
            className="flex-1"
          >
            {importing ? "Importando..." : "Importar Clientes"}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setFile(null);
              setTextData("");
              setResult(null);
              setPreview([]);
              setShowPreview(false);
              setSelectedUserId("");
              setAllowUpdates(false);
              if (fileInputRef.current) {
                fileInputRef.current.value = "";
              }
            }}
            disabled={importing}
          >
            Limpar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
