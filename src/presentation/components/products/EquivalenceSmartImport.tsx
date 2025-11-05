"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  AlertCircle,
  CheckCircle,
  Download,
  Info,
  Settings,
  Upload,
} from "lucide-react";
import { useRef, useState } from "react";

interface ImportStrategy {
  id: string;
  name: string;
  description: string;
  recommendation: string;
}

interface ImportResult {
  success: boolean;
  strategy: string;
  statistics: {
    totalProcessed: number;
    inserted: number;
    updated: number;
    unchanged?: number;
    errors: number;
  };
  message: string;
  errors: string[];
}

export function EquivalenceSmartImport() {
  const [file, setFile] = useState<File | null>(null);
  const [textData, setTextData] = useState("");
  const [strategy, setStrategy] = useState("auto");
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const strategies: ImportStrategy[] = [
    {
      id: "auto",
      name: "Automático (Recomendado)",
      description:
        "Detecta automaticamente se deve inserir ou atualizar baseado nos códigos",
      recommendation: "Melhor para a maioria dos casos",
    },
    {
      id: "upsert_by_codes",
      name: "UPSERT por Códigos",
      description:
        "Insere se não existe, atualiza se existe (baseado em product_code + equivalent_code)",
      recommendation: "Evita duplicatas por código",
    },
    {
      id: "upsert_by_id",
      name: "UPSERT por ID",
      description:
        "Insere se não existe, atualiza se existe (baseado no campo ID)",
      recommendation: "Use apenas se IDs são fornecidos no arquivo",
    },
    {
      id: "insert_only",
      name: "Apenas Inserir",
      description: "Apenas inserção de novos registros",
      recommendation: "Use apenas para dados garantidamente novos",
    },
  ];

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    // Validar extensão
    const fileName = selectedFile.name.toLowerCase();
    if (!fileName.endsWith(".txt") && !fileName.endsWith(".csv")) {
      toast({
        title: "Arquivo inválido",
        description: "Selecione um arquivo CSV ou TXT",
        variant: "destructive",
      });
      return;
    }

    // Validar tamanho
    if (selectedFile.size > 50 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "O arquivo não pode ser maior que 50MB",
        variant: "destructive",
      });
      return;
    }

    setFile(selectedFile);
    setResult(null);
    setPreview([]);

    try {
      const text = await selectedFile.text();
      setTextData(text);
      processPreview(text);

      toast({
        title: "Arquivo carregado",
        description: `${
          text.split("\n").filter((line) => line.trim()).length
        } linhas encontradas`,
      });
    } catch (error) {
      toast({
        title: "Erro ao ler arquivo",
        description: "Não foi possível processar o arquivo",
        variant: "destructive",
      });
    }
  };

  const processPreview = (text: string) => {
    const lines = text.split("\n").filter((line) => line.trim());
    const separator = text.includes(";") ? ";" : ",";

    const previewData = lines.slice(0, 10).map((line, index) => {
      const parts = line.split(separator);
      return {
        linha: index + 1,
        productCode: parts[0]?.trim().replace(/"/g, "") || "",
        equivalentCode: parts[1]?.trim().replace(/"/g, "") || "",
        isValid: parts[0]?.trim() && parts[1]?.trim(),
      };
    });

    setPreview(previewData);
  };

  const handleImport = async () => {
    if (!textData.trim()) {
      toast({
        title: "Dados vazios",
        description: "Selecione um arquivo ou cole os dados",
        variant: "destructive",
      });
      return;
    }

    setImporting(true);
    setProgress(0);
    setResult(null);

    try {
      const lines = textData.split("\n").filter((line) => line.trim());
      const separator = textData.includes(";") ? ";" : ",";

      const equivalences = lines
        .map((line) => {
          const parts = line.split(separator);
          return {
            product_code: parts[0]?.trim().replace(/"/g, "") || "",
            equivalent_code: parts[1]?.trim().replace(/"/g, "") || "",
          };
        })
        .filter((eq) => eq.product_code && eq.equivalent_code);

      const response = await fetch("/api/equivalences/smart-import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          equivalences,
          strategy,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setResult(result);

        toast({
          title: "Importação concluída",
          description: result.message,
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error);
      }
    } catch (error) {
      toast({
        title: "Erro na importação",
        description: `${error}`,
        variant: "destructive",
      });
    } finally {
      setImporting(false);
      setProgress(100);
    }
  };

  const downloadTemplate = () => {
    const template = `2040PM-OR;FCD0732
2040PM-OR;ALT0001
13E;EQV13E
14E;EQV14E
0986B03526;ALT0986B`;

    const blob = new Blob([template], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "template-equivalencias.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearForm = () => {
    setFile(null);
    setTextData("");
    setResult(null);
    setPreview([]);
    setShowPreview(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Importação Inteligente de Equivalências
          </CardTitle>
          <CardDescription>
            Sistema avançado de importação com múltiplas estratégias e
            deduplificação automática
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Seleção de Estratégia */}
          <div className="space-y-2">
            <Label htmlFor="strategy">Estratégia de Importação</Label>
            <Select value={strategy} onValueChange={setStrategy}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a estratégia" />
              </SelectTrigger>
              <SelectContent>
                {strategies.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{s.name}</span>
                      <span className="text-xs text-gray-500">
                        {s.recommendation}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Descrição da estratégia selecionada */}
            {strategies.find((s) => s.id === strategy) && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>
                    {strategies.find((s) => s.id === strategy)?.name}:
                  </strong>
                  <br />
                  {strategies.find((s) => s.id === strategy)?.description}
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Upload de Arquivo */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="file">Arquivo CSV/TXT</Label>
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="h-4 w-4 mr-2" />
                Template
              </Button>
            </div>
            <Input
              id="file"
              type="file"
              accept=".csv,.txt"
              onChange={handleFileSelect}
              ref={fileInputRef}
              disabled={importing}
            />
          </div>

          {/* Dados Manuais */}
          <div className="space-y-2">
            <Label htmlFor="manual-data">Ou cole os dados manualmente</Label>
            <Textarea
              id="manual-data"
              placeholder="Produto1;Equivalente1&#10;Produto2;Equivalente2&#10;..."
              value={textData}
              onChange={(e) => {
                setTextData(e.target.value);
                if (e.target.value) processPreview(e.target.value);
              }}
              rows={5}
              disabled={importing}
            />
          </div>

          {/* Preview */}
          {preview.length > 0 && (
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
              >
                {showPreview ? "Ocultar" : "Mostrar"} Preview ({preview.length}{" "}
                linhas)
              </Button>

              {showPreview && (
                <div className="border rounded-lg p-3 bg-gray-50">
                  <div className="space-y-2">
                    {preview.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 text-sm"
                      >
                        <Badge
                          variant={item.isValid ? "default" : "destructive"}
                        >
                          {item.linha}
                        </Badge>
                        <span className="font-mono">
                          {item.productCode} → {item.equivalentCode}
                        </span>
                        {!item.isValid && (
                          <span className="text-red-500 text-xs">
                            (Inválido)
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Progress */}
          {importing && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Processando...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {/* Resultado */}
          {result && (
            <Alert
              className={result.success ? "border-green-500" : "border-red-500"}
            >
              {result.success ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-semibold">{result.message}</p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p>
                        <strong>Total processadas:</strong>{" "}
                        {result.statistics.totalProcessed.toLocaleString()}
                      </p>
                      <p>
                        <strong>Inseridas:</strong>{" "}
                        {result.statistics.inserted.toLocaleString()}
                      </p>
                      {result.statistics.unchanged &&
                        result.statistics.unchanged > 0 && (
                          <p>
                            <strong>Sem alteração:</strong>{" "}
                            {result.statistics.unchanged.toLocaleString()}
                          </p>
                        )}
                    </div>
                    <div>
                      <p>
                        <strong>Atualizadas:</strong>{" "}
                        {result.statistics.updated.toLocaleString()}
                      </p>
                      <p>
                        <strong>Erros:</strong>{" "}
                        {result.statistics.errors.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {result.errors.length > 0 && (
                    <details className="mt-2">
                      <summary className="cursor-pointer font-semibold">
                        Ver erros ({result.errors.length})
                      </summary>
                      <ul className="mt-2 space-y-1 text-sm max-h-32 overflow-y-auto">
                        {result.errors.map((error, idx) => (
                          <li key={idx} className="text-red-600">
                            • {error}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Botões */}
          <div className="flex gap-2">
            <Button
              onClick={handleImport}
              disabled={!textData.trim() || importing}
              className="flex-1"
            >
              <Upload className="h-4 w-4 mr-2" />
              {importing ? "Importando..." : "Iniciar Importação"}
            </Button>
            <Button variant="outline" onClick={clearForm} disabled={importing}>
              Limpar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
