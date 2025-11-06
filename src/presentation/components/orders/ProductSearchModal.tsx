"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { DemoSearchSuggestions } from "@/presentation/components/products/DemoSearchSuggestions";
import { useProductSearchWithEquivalences } from "@/presentation/hooks/useProductSearchWithEquivalences";
import { LoadingSpinner } from "@/shared/presentation/components/ui/loading-spinner";
import {
  ArrowDown,
  ArrowUp,
  CornerDownLeft,
  Package,
  Search,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface ProductSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (product: ProductWithEquivalences) => void;
}

export function ProductSearchModal({
  isOpen,
  onClose,
  onSelect,
}: ProductSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [hasSearched, setHasSearched] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Hook de busca de produtos
  const { data, isLoading, error } = useProductSearchWithEquivalences({
    query: searchQuery,
    page: 1,
    pageSize: 20,
    enabled: hasSearched && searchQuery.length > 0,
  });

  const products = data?.data || [];

  // Foco automático ao abrir modal
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Reset ao fechar
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
      setSelectedIndex(0);
      setHasSearched(false);
    }
  }, [isOpen]);

  // Reset índice quando lista muda
  useEffect(() => {
    setSelectedIndex(0);
  }, [products]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setHasSearched(true);
      setSelectedIndex(0);
    }
  };

  const handleDemoSearch = (query: string) => {
    setSearchQuery(query);
    setHasSearched(true);
    setSelectedIndex(0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!products.length) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % products.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex(
          (prev) => (prev - 1 + products.length) % products.length
        );
        break;
      case "Enter":
        e.preventDefault();
        if (products[selectedIndex]) {
          onSelect(products[selectedIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        onClose();
        break;
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-7xl max-h-[90vh] mx-auto flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Buscar Produto
          </DialogTitle>
          <DialogDescription>
            Digite o código do produto para buscar e selecionar itens para o
            pedido
          </DialogDescription>
        </DialogHeader>

        {/* Área de conteúdo com scroll */}
        <div className="flex-1 overflow-y-auto space-y-4 px-1">
          {/* Campo de Busca */}
          <form onSubmit={handleSearch} className="space-y-4 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                type="text"
                placeholder="Digite o código do produto (ex: PH4701)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
                onKeyDown={handleKeyDown}
                className="pl-10 pr-10"
                autoComplete="off"
              />
              {searchQuery && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("");
                    setHasSearched(false);
                  }}
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            <Button
              type="submit"
              disabled={!searchQuery.trim() || isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Buscando...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Buscar Produto
                </>
              )}
            </Button>
          </form>

          {/* Demo Search Suggestions - Apenas quando não há busca */}
          {!hasSearched && !isLoading && (
            <div className="shrink-0">
              <DemoSearchSuggestions onSearch={handleDemoSearch} isLoading={isLoading} />
            </div>
          )}

          {/* Dicas de Navegação */}
          {products.length > 0 && (
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded shrink-0">
              <span className="flex items-center gap-1">
                <ArrowUp className="h-3 w-3" />
                <ArrowDown className="h-3 w-3" />
                Navegar
              </span>
              <span className="flex items-center gap-1">
                <CornerDownLeft className="h-3 w-3" />
                Selecionar
              </span>
              <span>Esc - Cancelar</span>
            </div>
          )}

          {/* Resultados */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner className="mr-2" />
              <span>Buscando produtos...</span>
            </div>
          )}

          {error && (
            <div className="text-center py-8 text-red-600">
              <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Erro ao buscar produtos</p>
              <p className="text-sm text-muted-foreground">{error.message}</p>
            </div>
          )}

          {hasSearched && !isLoading && products.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum produto encontrado</p>
              <p className="text-sm">Tente uma busca diferente</p>
            </div>
          )}

          {products.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead className="w-[120px]">Estoque</TableHead>
                    <TableHead className="w-[120px]">Preço</TableHead>
                    <TableHead className="w-[100px]">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product, index) => (
                    <TableRow
                      key={product.id}
                      className={`cursor-pointer transition-colors ${
                        index === selectedIndex
                          ? "bg-primary/10 border-primary"
                          : "hover:bg-muted/50"
                      }`}
                      onClick={() => onSelect(product)}
                    >
                      <TableCell>
                        <div className="space-y-0.5">
                          <div className="font-medium">{product.product}</div>
                          {product.groupName && (
                            <div className="text-xs text-gray-500">
                              {product.groupName}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {formatNumber(product.stock)}
                      </TableCell>
                      <TableCell>
                        <span className="font-mono font-medium">
                          {formatPrice(product.price)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant={
                            index === selectedIndex ? "default" : "outline"
                          }
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelect(product);
                          }}
                        >
                          Selecionar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
