"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/utils";
import { Calendar, Filter, Search, X } from "lucide-react";
import { useEffect, useState } from "react";

interface OrderSearchFormProps {
  onSearch: (filters: OrderSearchFilters) => void;
  onClear: () => void;
  isLoading?: boolean;
  currentFilters?: OrderSearchFilters;
}

export interface OrderSearchFilters {
  query: string;
  status?: string;
  clientId?: string;
  dateFrom?: string;
  dateTo?: string;
}

const statusOptions = [
  { value: "all", label: "Todos os status" },
  { value: "draft", label: "Rascunho" },
  { value: "confirmed", label: "Confirmado" },
  { value: "processing", label: "Processando" },
  { value: "shipped", label: "Enviado" },
  { value: "delivered", label: "Entregue" },
  { value: "cancelled", label: "Cancelado" },
];

export function OrderSearchForm({
  onSearch,
  onClear,
  isLoading = false,
  currentFilters,
}: OrderSearchFormProps) {
  const [filters, setFilters] = useState<OrderSearchFilters>({
    query: currentFilters?.query || "",
    status: currentFilters?.status || "all",
    clientId: currentFilters?.clientId || "",
    dateFrom: currentFilters?.dateFrom || "",
    dateTo: currentFilters?.dateTo || "",
  });

  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Sincronizar com filtros externos
  useEffect(() => {
    if (currentFilters) {
      setFilters(currentFilters);
    }
  }, [currentFilters]);

  const handleInputChange = (
    field: keyof OrderSearchFilters,
    value: string
  ) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(filters);
  };

  const handleClear = () => {
    const emptyFilters: OrderSearchFilters = {
      query: "",
      status: "all",
      clientId: "",
      dateFrom: "",
      dateTo: "",
    };
    setFilters(emptyFilters);
    setShowAdvancedFilters(false);
    onClear();
  };

  const hasActiveFilters =
    filters.status || filters.clientId || filters.dateFrom || filters.dateTo;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch(e);
    }
  };

  return (
    <Card>
      <CardContent className="p-4 sm:p-6">
        <form onSubmit={handleSearch} className="space-y-4">
          {/* Busca principal */}
          <div className="flex flex-col sm:flex-row  gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="Buscar por número do pedido ou nome do cliente..."
                value={filters.query}
                onChange={(e) => handleInputChange("query", e.target.value)}
                onKeyDown={handleKeyDown}
                className="pl-10 h-10"
                disabled={isLoading}
              />
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={cn(
                  "flex items-center gap-2 h-10",
                  hasActiveFilters && "border-blue-500 text-blue-600"
                )}
              >
                <Filter className="h-4 w-4" />
                Filtros
                {hasActiveFilters && (
                  <span className="bg-blue-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[1.25rem] h-5 flex items-center justify-center">
                    {
                      [
                        filters.status,
                        filters.clientId,
                        filters.dateFrom,
                        filters.dateTo,
                      ].filter(Boolean).length
                    }
                  </span>
                )}
              </Button>

              <Button
                type="submit"
                disabled={isLoading}
                size="sm"
                className="h-10"
              >
                {isLoading ? "Buscando..." : "Buscar"}
              </Button>

              {(filters.query || hasActiveFilters) && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleClear}
                  className="h-10"
                  disabled={isLoading}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Filtros avançados */}
          {showAdvancedFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-gray-50 rounded-lg">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Status
                </label>
                <Select
                  value={filters.status}
                  onValueChange={(value) => handleInputChange("status", value)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Selecionar status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  <Calendar className="inline h-3 w-3 mr-1" />
                  Data de início
                </label>
                <Input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) =>
                    handleInputChange("dateFrom", e.target.value)
                  }
                  className="h-9"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  <Calendar className="inline h-3 w-3 mr-1" />
                  Data final
                </label>
                <Input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => handleInputChange("dateTo", e.target.value)}
                  className="h-9"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Cliente
                </label>
                <Input
                  placeholder="ID do cliente"
                  value={filters.clientId}
                  onChange={(e) =>
                    handleInputChange("clientId", e.target.value)
                  }
                  className="h-9"
                />
              </div>
            </div>
          )}

          {/* Dicas de uso */}
          <div className="text-xs text-gray-500 space-y-1">
            <p>
              💡 <strong>Dicas:</strong>
            </p>
            <p>
              • Use{" "}
              <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">
                Enter
              </kbd>{" "}
              para buscar rapidamente
            </p>
            <p>
              • Busque por número do pedido (ex: 20241205001) ou nome do cliente
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
