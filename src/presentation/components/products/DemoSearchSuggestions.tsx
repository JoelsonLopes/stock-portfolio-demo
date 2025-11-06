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
        { query: "filtro", description: "Filtro de Ar, Óleo, Combustível e Cabine" },
        { query: "óleo", description: "Óleo 5W30, 10W40, 15W40, 20W50 (Sintético/Mineral)" },
        { query: "palheta", description: "Palheta Universal e Palheta Silicone" },
      ],
    },
    {
      category: "Exemplos de Produtos Reais",
      examples: [
        { query: "Óleo 5W30 Sintético", description: "Produto mais vendido" },
        { query: "Filtro de Óleo", description: "Item de alta demanda" },
        { query: "Palheta Universal", description: "Produto popular" },
      ],
    },
  ];

  return (
    <Card className="border-2 border-blue-500/20 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 shadow-lg">
      <CardContent className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3 pb-3 border-b border-blue-200 dark:border-blue-800">
          <div className="p-2 rounded-lg bg-blue-500/10 dark:bg-blue-500/20">
            <Lightbulb className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-blue-900 dark:text-blue-100">
              Exemplos de Pesquisa
            </h3>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
              Clique para testar a busca de produtos
            </p>
          </div>
        </div>

        {/* Search Examples */}
        <div className="space-y-5">
          {searchExamples.map((category, idx) => (
            <div key={idx} className="space-y-3">
              <h4 className="text-sm font-bold text-blue-800 dark:text-blue-200 uppercase tracking-wide">
                {category.category}
              </h4>
              <div className="grid gap-3">
                {category.examples.map((example, exIdx) => (
                  <div
                    key={exIdx}
                    className="group relative overflow-hidden rounded-xl bg-white dark:bg-slate-900/50 border border-blue-100 dark:border-blue-900 shadow-sm hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-200"
                  >
                    <div className="flex items-center gap-3 p-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <code className="text-sm font-mono font-bold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/50 px-2 py-1 rounded">
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
                        className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow transition-all duration-200 shrink-0"
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
        <div className="pt-4 border-t border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-center gap-2 text-xs text-blue-700 dark:text-blue-300 bg-blue-100/50 dark:bg-blue-900/30 rounded-lg py-2.5 px-4">
            <span className="text-base">💡</span>
            <p className="font-medium">
              A busca funciona com códigos de produto, descrições e equivalências
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
