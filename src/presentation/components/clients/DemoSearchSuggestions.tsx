"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Lightbulb, Search } from "lucide-react";

interface DemoSearchSuggestionsProps {
  onSearch: (query: string) => void;
  isLoading?: boolean;
}

export function DemoSearchSuggestions({ onSearch, isLoading }: DemoSearchSuggestionsProps) {
  const searchExamples = [
    {
      category: "Pesquisas por Nome",
      examples: [
        { query: "Silva", description: "Auto Center Silva (São Paulo)" },
        { query: "Auto", description: "Auto Center Silva, Auto Peças Modelo" },
        { query: "Carlos", description: "Carlos Ferreira (Brasília)" },
      ],
    },
    {
      category: "Exemplos de Clientes Reais",
      examples: [
        { query: "Ana Costa", description: "Cliente de Fortaleza" },
        { query: "Distribuidora AutoParts", description: "Cliente de Florianópolis" },
        { query: "CLI-0001", description: "Auto Center Silva - código do cliente" },
      ],
    },
  ];

  return (
    <Card className="border-2 border-green-500/20 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 shadow-lg">
      <CardContent className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3 pb-3 border-b border-green-200 dark:border-green-800">
          <div className="p-2 rounded-lg bg-green-500/10 dark:bg-green-500/20">
            <Lightbulb className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-green-900 dark:text-green-100">
              Exemplos de Pesquisa
            </h3>
            <p className="text-xs text-green-700 dark:text-green-300 mt-0.5">
              Clique para testar a busca de clientes
            </p>
          </div>
        </div>

        {/* Search Examples */}
        <div className="space-y-5">
          {searchExamples.map((category, idx) => (
            <div key={idx} className="space-y-3">
              <h4 className="text-sm font-bold text-green-800 dark:text-green-200 uppercase tracking-wide">
                {category.category}
              </h4>
              <div className="grid gap-3">
                {category.examples.map((example, exIdx) => (
                  <div
                    key={exIdx}
                    className="group relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/50 border border-green-100 dark:border-green-900 shadow-sm hover:shadow-md hover:border-green-300 dark:hover:border-green-700 transition-all duration-200"
                  >
                    <div className="flex items-center gap-3 p-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <code className="text-sm font-mono font-bold text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/50 px-2 py-1 rounded">
                            {example.query}
                          </code>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                          {example.description}
                        </p>
                      </div>
                      <Button
                        variant="default"
                        size="sm"
                        className="h-9 px-4 bg-green-600 hover:bg-green-700 text-white shadow-sm hover:shadow transition-all duration-200 shrink-0"
                        onClick={() => onSearch(example.query)}
                        disabled={isLoading}
                      >
                        <Search className="h-4 w-4 mr-2" />
                        Testar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Info */}
        <div className="pt-4 border-t border-green-200 dark:border-green-800">
          <div className="flex items-center justify-center gap-2 text-xs text-green-700 dark:text-green-300 bg-green-100/50 dark:bg-green-900/30 rounded-lg py-2.5 px-4">
            <span className="text-base">💡</span>
            <p className="font-medium">
              A busca funciona com nome, CPF, CNPJ, email e telefone
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
