"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ProductWithEquivalences } from "@/modules/inventory/domain/entities/product-with-equivalences.entity";
import { useProductSearchWithEquivalences } from "@/presentation/hooks/useProductSearchWithEquivalences";
import { LoadingSpinner } from "@/shared/presentation/components/ui/loading-spinner";
import { AlertCircle, Check, Package, Plus, Search, X } from "lucide-react";
import { useEffect, useState } from "react";

interface ProductSelectorProps {
  onSelect: (product: ProductWithEquivalences) => void;
  selectedProducts?: ProductWithEquivalences[];
}

export function ProductSelector({
  onSelect,
  selectedProducts = [],
}: ProductSelectorProps) {
  const [inputValue, setInputValue] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  const { data, isLoading, error, refetch } = useProductSearchWithEquivalences({
    query: searchQuery,
    page: 1,
    pageSize: 50,
    enabled: hasSearched,
  });

  const products = data?.data || [];

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 600);
    };
    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedQuery = inputValue.trim();
    if (trimmedQuery) {
      setSearchQuery(trimmedQuery);
      setHasSearched(true);
      refetch();
    }
  };

  const handleClear = () => {
    setInputValue("");
    setSearchQuery("");
    setHasSearched(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSubmit(e);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price);
  };

  const formatNumber = (number: number) => {
    return new Intl.NumberFormat("pt-BR").format(number);
  };

  const isProductSelected = (productId: string) => {
    return selectedProducts.some((p) => p.id === productId);
  };

  return (
    <div className="space-y-4">
      {/* Produtos Selecionados */}
      {selectedProducts.length > 0 && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader className="px-4 sm:px-6 pb-2">
            <CardTitle className="flex items-center gap-2 text-lg text-green-800">
              <Check className="h-5 w-5" />
              Produtos Selecionados ({selectedProducts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pt-0">
            <div className="space-y-2">
              {selectedProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between bg-white p-2 rounded border border-green-200"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-green-900 truncate">
                      {product.product}
                    </div>
                    <div className="text-sm text-green-700">
                      Estoque: {formatNumber(product.stock)} • Preço:{" "}
                      {formatPrice(product.price)}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onSelect(product)}
                    className="text-green-700 border-green-300 hover:bg-green-100 ml-2"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar Novamente
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Formulário de Busca */}
      <Card>
        <CardHeader className="px-4 sm:px-6">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Search className="h-5 w-5" />
            Buscar Produtos
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Input
                  type="text"
                  placeholder="Digite o nome do produto, código ou aplicação..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value.toUpperCase())}
                  onKeyPress={handleKeyPress}
                  className="pr-10 w-full uppercase"
                  disabled={isLoading}
                />
                {inputValue && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setInputValue("")}
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                    disabled={isLoading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <Button
                type="submit"
                disabled={!inputValue.trim() || isLoading}
                className="sm:w-auto sm:min-w-[100px]"
              >
                {isLoading ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Buscando...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Buscar
                  </>
                )}
              </Button>
            </div>

            {searchQuery && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-sm text-gray-600 bg-blue-50 p-3 rounded gap-2">
                <span className="text-xs sm:text-sm">
                  Resultados para:{" "}
                  <strong className="break-all">"{searchQuery}"</strong>
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleClear}
                  disabled={isLoading}
                  className="w-full sm:w-auto"
                >
                  <X className="h-4 w-4 mr-1" />
                  Limpar busca
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Estados da Busca */}
      {isLoading && (
        <Card>
          <CardHeader className="px-4 sm:px-6">
            <CardTitle>Resultados da Busca</CardTitle>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <LoadingSpinner size="lg" className="mx-auto mb-4" />
                <p className="text-gray-600">Buscando produtos...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card>
          <CardHeader className="px-4 sm:px-6">
            <CardTitle>Resultados da Busca</CardTitle>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Erro ao buscar produtos: {error.message || "Erro desconhecido"}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {!hasSearched && (
        <Card>
          <CardHeader className="px-4 sm:px-6">
            <CardTitle>Produtos</CardTitle>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="h-12 w-12 sm:h-16 sm:w-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">
                Nenhuma busca realizada
              </h3>
              <p className="text-gray-500 max-w-md text-sm sm:text-base">
                Use o formulário acima para buscar produtos por nome, código ou
                aplicação.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {hasSearched && products.length === 0 && !isLoading && (
        <Card>
          <CardHeader className="px-4 sm:px-6">
            <CardTitle>Resultados da Busca</CardTitle>
            <div className="text-sm text-gray-600">
              Busca por: <strong className="break-all">"{searchQuery}"</strong>
            </div>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="h-12 w-12 sm:h-16 sm:w-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">
                Nenhum produto encontrado
              </h3>
              <p className="text-gray-500 max-w-md text-sm sm:text-base">
                Não foram encontrados produtos que correspondam à sua busca por
                "{searchQuery}". Tente usar termos diferentes ou verifique a
                ortografia.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {hasSearched && products.length > 0 && !isLoading && (
        <Card>
          <CardHeader className="px-4 sm:px-6">
            <CardTitle>Resultados da Busca</CardTitle>
            <div className="text-sm text-gray-600">
              <strong>{products.length}</strong> produto
              {products.length !== 1 ? "s" : ""} encontrado
              {products.length !== 1 ? "s" : ""} para:{" "}
              <strong className="break-all">"{searchQuery}"</strong>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[300px] md:w-[40%]">
                      Produto
                    </TableHead>
                    {!isMobile && (
                      <TableHead className="w-[200px] md:w-[30%]">
                        Aplicação
                      </TableHead>
                    )}
                    <TableHead className="text-center w-[80px] md:w-[10%]">
                      Qtd
                    </TableHead>
                    <TableHead className="text-right w-[100px] md:w-[15%]">
                      Preço
                    </TableHead>
                    <TableHead className="text-center w-[80px] md:w-[5%]">
                      Ação
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product.id} className="hover:bg-gray-50">
                      <TableCell className="font-medium py-2">
                        <div className="space-y-1">
                          <div className="font-medium">{product.product}</div>
                        </div>
                      </TableCell>
                      {!isMobile && (
                        <TableCell className="py-2">
                          {product.application ? (
                            <span className="text-sm text-gray-700">
                              {product.application}
                            </span>
                          ) : (
                            <span className="text-gray-400 italic">
                              Não informado
                            </span>
                          )}
                        </TableCell>
                      )}
                      <TableCell className="text-center py-2">
                        <span className="font-mono text-sm">
                          {formatNumber(product.stock)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right py-2">
                        <span className="font-mono text-sm">
                          {formatPrice(product.price)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center py-2">
                        <Button
                          size="sm"
                          onClick={() => onSelect(product)}
                          className="w-full sm:w-auto"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Adicionar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
