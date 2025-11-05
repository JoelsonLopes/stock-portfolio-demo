"use client";

import { Card } from "@/components/ui/card";
import { Loader2, Package } from "lucide-react";
import { useEffect, useRef } from "react";

interface ProductSuggestion {
  product: string;
  application?: string;
}

interface ProductSuggestionsProps {
  suggestions: ProductSuggestion[];
  isLoading: boolean;
  showSuggestions: boolean;
  selectedIndex: number;
  onSelect: (suggestion: ProductSuggestion) => void;
  onClose: () => void;
  position?: {
    top: number;
    left: number;
    width: number;
  };
}

export function ProductSuggestions({
  suggestions,
  isLoading,
  showSuggestions,
  selectedIndex,
  onSelect,
  onClose,
  position = { top: 0, left: 0, width: 300 },
}: ProductSuggestionsProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Fechar ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    if (showSuggestions) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showSuggestions, onClose]);

  if (!showSuggestions && !isLoading) {
    return null;
  }

  return (
    <div
      className="fixed z-[9999]" // 🔥 MUDANÇA: fixed ao invés de absolute
      style={{
        top: `${position.top}px`, // 🔥 MUDANÇA: Adicionar 'px'
        left: `${position.left}px`, // 🔥 MUDANÇA: Adicionar 'px'
        width: `${position.width}px`, // 🔥 MUDANÇA: Adicionar 'px'
        maxWidth: "90vw",
      }}
    >
      <Card
        ref={containerRef}
        className="shadow-lg border border-gray-300 bg-white max-h-48 overflow-hidden"
      >
        {/* Header */}
        <div className="px-2 py-1 border-b bg-gray-50 flex items-center gap-1">
          <Package className="h-3 w-3 text-gray-600" />
          <span className="text-xs font-medium text-gray-700">
            {isLoading
              ? "Buscando..."
              : `${suggestions.length} sugestão${
                  suggestions.length !== 1 ? "ões" : ""
                }`}
          </span>
          {isLoading && (
            <Loader2 className="h-3 w-3 animate-spin text-gray-600" />
          )}
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="p-4 text-center">
            <Loader2 className="h-6 w-6 animate-spin text-blue-500 mx-auto mb-2" />
            <span className="text-sm text-gray-600">Buscando produtos...</span>
          </div>
        )}

        {/* Suggestions list */}
        {!isLoading && suggestions.length > 0 && (
          <div className="max-h-48 overflow-y-auto">
            {suggestions.map((suggestion, index) => (
              <div
                key={`${suggestion.product}-${index}`}
                className={`px-2 py-1.5 transition-colors border-b border-gray-100 last:border-b-0 cursor-pointer
                  ${
                    index === selectedIndex ? "bg-blue-50" : "hover:bg-gray-100"
                  }`}
                onClick={() => onSelect(suggestion)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-gray-900 truncate">
                      {suggestion.product}
                    </div>
                    {suggestion.application && (
                      <div className="text-xs text-gray-500 truncate">
                        {suggestion.application}
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    💡
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No results */}
        {!isLoading && suggestions.length === 0 && showSuggestions && (
          <div className="p-4 text-center text-gray-500">
            <Package className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <span className="text-sm">Nenhum produto encontrado</span>
          </div>
        )}

        {/* Instructions footer */}
        {!isLoading && suggestions.length > 0 && (
          <div className="px-2 py-1 bg-gray-50 border-t">
            <div className="text-xs text-gray-500">
              Continue digitando • Esc para fechar
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
