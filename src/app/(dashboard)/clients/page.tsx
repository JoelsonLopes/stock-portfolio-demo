"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClientSearchForm } from "@/presentation/components/clients/ClientSearchForm";
import { ClientsTable } from "@/presentation/components/clients/ClientsTable";
import { useClientSearch } from "@/presentation/hooks/useClientSearch";
import { useState } from "react";

export default function ClientsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const { data, isLoading, error, refetch } = useClientSearch({
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
      <Card>
        <CardHeader className="px-4 sm:px-6">
          <CardTitle>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">
              Consulta de Clientes
            </h1>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <ClientSearchForm
            onSearch={handleSearch}
            onClear={handleClearSearch}
            isLoading={isLoading}
            currentQuery={searchQuery}
          />
        </CardContent>
      </Card>

      <div className="w-full overflow-hidden rounded-lg">
        <ClientsTable
          clients={data?.data || []}
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
