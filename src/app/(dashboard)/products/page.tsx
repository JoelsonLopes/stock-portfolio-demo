"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DemoSearchSuggestions } from "@/presentation/components/products/DemoSearchSuggestions";
import { ProductSearchForm } from "@/presentation/components/products/ProductSearchForm";
import { ProductsTable } from "@/presentation/components/products/ProductsTable";
import { useProductSearchWithEquivalences } from "@/presentation/hooks/useProductSearchWithEquivalences";
import { useState } from "react";

export default function ProductsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [page, setPage] = useState(1);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const pageSize = 50;

  const { data, isLoading, error, refetch } = useProductSearchWithEquivalences({
    query: searchQuery,
    page,
    pageSize,
    enabled: hasSearched,
  });

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setHasSearched(true);
    setPage(1); // Resetar para primeira página em nova busca
    refetch();
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setHasSearched(false);
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6 max-w-7xl">
      {/* Container com hover para sugestões */}
      <div
        className="relative"
        onMouseEnter={() => !hasSearched && setShowSuggestions(true)}
        onMouseLeave={() => setShowSuggestions(false)}
      >
        <Card>
          <CardHeader className="px-4 sm:px-6">
            <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">
                Consulta de Produtos
              </h1>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <ProductSearchForm
              onSearch={handleSearch}
              onClear={handleClearSearch}
              isLoading={isLoading}
              currentQuery={searchQuery}
            />
          </CardContent>
        </Card>

        {/* Demo Search Suggestions - Overlay absoluto que aparece acima */}
        {!hasSearched && (
          <div
            className={`absolute top-full left-0 right-0 mt-4 z-10 transition-all duration-500 ease-in-out hidden lg:block ${
              showSuggestions
                ? "opacity-100 translate-y-0 scale-100"
                : "opacity-0 -translate-y-4 scale-95 pointer-events-none"
            }`}
            onMouseEnter={() => setShowSuggestions(true)}
            onMouseLeave={() => setShowSuggestions(false)}
          >
            <DemoSearchSuggestions onSearch={handleSearch} isLoading={isLoading} />
          </div>
        )}
      </div>

      {/* Mobile: Sugestões sempre visíveis abaixo do formulário */}
      {!hasSearched && (
        <div className="lg:hidden">
          <DemoSearchSuggestions onSearch={handleSearch} isLoading={isLoading} />
        </div>
      )}

      <div className="w-full overflow-hidden rounded-lg">
        <ProductsTable
          products={data?.data || []}
          loading={isLoading}
          hasSearched={hasSearched}
          searchQuery={searchQuery}
          error={error}
          total={data?.total || 0}
          page={page}
          pageSize={pageSize}
          onPageChange={handlePageChange}
        />
      </div>
    </div>
  );
}
