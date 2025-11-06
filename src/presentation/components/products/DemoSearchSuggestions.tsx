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
      category: "Pesquisas por Categoria",
      examples: [
        { query: "filtro", description: "Encontra filtros de ar, óleo, combustível e cabine" },
        { query: "óleo", description: "Lista todos os óleos disponíveis (sintético, mineral)" },
        { query: "palheta", description: "Mostra palhetas universais e de silicone" },
      ],
    },
    {
      category: "Códigos Reais de Produtos",
      examples: [
        { query: "WOE342", description: "Filtro de Óleo - código específico" },
        { query: "OL5W30-1L", description: "Óleo 5W30 Sintético 1L" },
        { query: "PAL20", description: "Palheta Universal tamanho 20" },
      ],
    },
  ];

  return (
    <Card className="border-dashed border-2 border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20">
      <CardContent className="pt-6 space-y-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <Lightbulb className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1 flex-1">
            <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
              Exemplos de Pesquisa
            </h3>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              Clique em qualquer exemplo abaixo para testar a busca de produtos
            </p>
          </div>
        </div>

        {/* Search Examples */}
        <div className="space-y-4">
          {searchExamples.map((category, idx) => (
            <div key={idx} className="space-y-2">
              <h4 className="text-xs font-semibold text-blue-800 dark:text-blue-200">
                {category.category}
              </h4>
              <div className="space-y-2">
                {category.examples.map((example, exIdx) => (
                  <div
                    key={exIdx}
                    className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                  >
                    <div className="flex-1 space-y-0.5">
                      <code className="text-xs font-mono font-semibold text-blue-900 dark:text-blue-100">
                        {example.query}
                      </code>
                      <p className="text-xs text-blue-600 dark:text-blue-300">
                        {example.description}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-3 text-blue-700 hover:text-blue-900 hover:bg-blue-100 dark:text-blue-300 dark:hover:text-blue-100 dark:hover:bg-blue-800"
                      onClick={() => onSearch(example.query)}
                      disabled={isLoading}
                    >
                      <Search className="h-3.5 w-3.5 mr-1.5" />
                      Testar
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Info */}
        <div className="pt-2 border-t border-blue-200 dark:border-blue-800">
          <p className="text-xs text-blue-600 dark:text-blue-400 text-center">
            💡 Dica: A busca funciona com códigos de produto, descrições e equivalências
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
