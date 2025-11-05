"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/shared/infrastructure/database/supabase-wrapper";

interface ProductSuggestion {
  product: string;
  application?: string;
}

interface UseProductAutocompleteOptions {
  debounceMs?: number;
  maxSuggestions?: number;
  minQueryLength?: number;
}

interface UseProductAutocompleteReturn {
  suggestions: ProductSuggestion[];
  isLoading: boolean;
  showSuggestions: boolean;
  selectedIndex: number;
  searchProduct: (query: string) => void;
  selectSuggestion: (index: number) => ProductSuggestion | null;
  clearSuggestions: () => void;
  navigateUp: () => void;
  navigateDown: () => void;
  selectCurrent: () => ProductSuggestion | null;
}

export function useProductAutocomplete(
  options: UseProductAutocompleteOptions = {},
): UseProductAutocompleteReturn {
  const { debounceMs = 300, maxSuggestions = 5, minQueryLength = 4 } = options;

  const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [currentQuery, setCurrentQuery] = useState("");

  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Função para buscar produtos no Supabase
  const fetchProducts = async (query: string): Promise<ProductSuggestion[]> => {
    try {
      // Cancelar requisição anterior se existir
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      const { data, error } = await supabase
        .from("products")
        .select("product, application")
        .ilike("product", `${query}%`)
        .limit(maxSuggestions)
        .abortSignal(abortController.signal);

      if (error) {
        console.error("Erro ao buscar produtos:", error);
        return [];
      }

      return data || [];
    } catch (error) {
      // Ignorar erros de abort
      if (error instanceof Error && error.name === "AbortError") {
        return [];
      }
      console.error("Erro na busca de produtos:", error);
      return [];
    }
  };

  // Função principal para buscar produtos
  const searchProduct = (query: string) => {
    const trimmedQuery = query.trim().toUpperCase();
    setCurrentQuery(trimmedQuery);

    // Limpar timeout anterior
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Se query muito pequena, limpar sugestões
    if (trimmedQuery.length < minQueryLength) {
      setSuggestions([]);
      setShowSuggestions(false);
      setSelectedIndex(-1);
      return;
    }

    // Debounce da busca
    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);

      try {
        const results = await fetchProducts(trimmedQuery);
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
        setSelectedIndex(-1);
      } catch (error) {
        console.error("Erro na busca:", error);
        setSuggestions([]);
        setShowSuggestions(false);
      } finally {
        setIsLoading(false);
      }
    }, debounceMs);
  };

  // Selecionar sugestão por índice
  const selectSuggestion = (index: number): ProductSuggestion | null => {
    if (index >= 0 && index < suggestions.length) {
      const selected = suggestions[index];
      clearSuggestions();
      return selected;
    }
    return null;
  };

  // Limpar sugestões
  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    setCurrentQuery("");

    // Cancelar timeout pendente
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Cancelar requisição pendente
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  // Navegação para cima
  const navigateUp = () => {
    setSelectedIndex((prev) => {
      if (prev <= 0) return suggestions.length - 1;
      return prev - 1;
    });
  };

  // Navegação para baixo
  const navigateDown = () => {
    setSelectedIndex((prev) => {
      if (prev >= suggestions.length - 1) return 0;
      return prev + 1;
    });
  };

  // Selecionar item atual
  const selectCurrent = (): ProductSuggestion | null => {
    if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
      return selectSuggestion(selectedIndex);
    }
    return null;
  };

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    suggestions,
    isLoading,
    showSuggestions,
    selectedIndex,
    searchProduct,
    selectSuggestion,
    clearSuggestions,
    navigateUp,
    navigateDown,
    selectCurrent,
  };
}
