"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ProductWithEquivalences } from "@/modules/inventory/domain/entities/product-with-equivalences.entity";
import { useIsMobile } from "@/presentation/hooks/use-mobile";
import { LoadingSpinner } from "@/shared/presentation/components/ui/loading-spinner";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  Calculator,
  Package,
  Percent,
  Search,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface Discount {
  id: string;
  name: string;
  discount_percentage: number;
  commission_percentage?: number;
}

interface ProductsTableProps {
  products: ProductWithEquivalences[];
  loading?: boolean;
  hasSearched: boolean;
  searchQuery: string;
  error?: any;
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export function ProductsTable({
  products,
  loading,
  hasSearched,
  searchQuery,
  error,
  total,
  page,
  pageSize,
  onPageChange,
}: ProductsTableProps) {
  // Hook para detectar mobile
  const isMobile = useIsMobile();

  // Estados para a modal de desconto
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] =
    useState<ProductWithEquivalences | null>(null);
  const [selectedDiscountId, setSelectedDiscountId] = useState<string>("");

  // Buscar descontos disponíveis
  const { data: discountsResponse } = useQuery({
    queryKey: ["discounts", "active"],
    queryFn: async () => {
      const response = await fetch("/api/discounts?active=true");
      if (!response.ok) throw new Error("Erro ao buscar descontos");
      return response.json();
    },
  });

  const discounts = Array.isArray(discountsResponse?.data)
    ? discountsResponse.data
    : [];

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price);
  };

  const formatNumber = (number: number) => {
    return new Intl.NumberFormat("pt-BR").format(number);
  };

  // Função para calcular desconto (preço unitário)
  const calculateDiscount = () => {
    if (!selectedProduct)
      return {
        originalPrice: 0,
        discountAmount: 0,
        finalPrice: 0,
        discountPercentage: 0,
      };

    const originalPrice = selectedProduct.price;
    let discountPercentage = 0;

    if (selectedDiscountId) {
      const discount = discounts.find(
        (d: Discount) => d.id === selectedDiscountId
      );
      if (discount) {
        discountPercentage =
          parseFloat(discount.discount_percentage.toString()) || 0;
      }
    }

    const discountAmount = (originalPrice * discountPercentage) / 100;
    const finalPrice = originalPrice - discountAmount;

    return { originalPrice, discountAmount, finalPrice, discountPercentage };
  };

  // Abrir modal de desconto
  const handleOpenDiscountModal = (product: ProductWithEquivalences) => {
    setSelectedProduct(product);
    setSelectedDiscountId("");
    setIsDiscountModalOpen(true);
  };

  // Fechar modal
  const handleCloseDiscountModal = () => {
    setIsDiscountModalOpen(false);
    setSelectedProduct(null);
    setSelectedDiscountId("");
  };

  // Loading state
  if (loading) {
    return (
      <Card>
        <CardHeader className="px-4 sm:px-6">
          <CardTitle>Resultados da Busca</CardTitle>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <div className="space-y-4">
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <LoadingSpinner size="lg" className="mx-auto mb-4" />
                <p className="text-gray-600">Buscando produtos...</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
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
    );
  }

  // Initial state - no search performed
  if (!hasSearched) {
    return (
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
    );
  }

  // No results found
  if (hasSearched && products.length === 0) {
    return (
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
              Não foram encontrados produtos que correspondam à sua busca por "
              {searchQuery}". Tente usar termos diferentes ou verifique a
              ortografia.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { originalPrice, discountAmount, finalPrice, discountPercentage } =
    calculateDiscount();

  // Results found
  return (
    <>
      <Card>
        <CardHeader className="px-4 sm:px-6">
          <CardTitle>Resultados da Busca</CardTitle>
          <div className="flex flex-col sm:flex-row  items-start sm:items-center justify-between">
            <div className="text-sm text-gray-600">
              <strong>{products.length}</strong> produto
              {products.length !== 1 ? "s" : ""} encontrado
              {products.length !== 1 ? "s" : ""} para:{" "}
              <strong className="break-all">"{searchQuery}"</strong>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[400px] md:w-[40%]">
                    Produto
                  </TableHead>
                  {!isMobile && (
                    <TableHead className="w-[30%]">Aplicação</TableHead>
                  )}
                  <TableHead className="text-center w-[100px] md:w-[15%]">
                    Qtd
                  </TableHead>
                  <TableHead className="text-right w-[100px] md:w-[15%]">
                    Preço
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id} className="hover:bg-gray-50 h-2">
                    <TableCell className="font-medium w-[400px] md:w-[40%] py-1 whitespace-nowrap">
                      <div className="space-y-0.5">
                        <div className="font-medium">{product.product}</div>
                        {product.groupName && (
                          <span className="text-xs text-gray-500">{product.groupName}</span>
                        )}
                      </div>
                    </TableCell>
                    {!isMobile && (
                      <TableCell className="w-[30%] py-0">
                        {product.application ? (
                          <div className="max-w-[500px] overflow-hidden">
                            <span
                              className="text-sm text-gray-700 line-clamp-2 hover:line-clamp-none"
                              title={product.application}
                            >
                              {product.application}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">
                            Sem aplicação especificada
                          </span>
                        )}
                      </TableCell>
                    )}
                    <TableCell className="text-center w-[100px] md:w-[15%]">
                      {formatNumber(product.stock)}
                    </TableCell>
                    <TableCell className="text-right w-[100px] md:w-[15%]">
                      <div className="flex items-center justify-end gap-2">
                        {product.price > 0 ? (
                          <span className="">{formatPrice(product.price)}</span>
                        ) : (
                          <span className="text-gray-400">Consultar</span>
                        )}
                        {product.price > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 hover:bg-blue-100 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            onClick={() => handleOpenDiscountModal(product)}
                            title="Calcular desconto"
                          >
                            <Calculator className="h-3 w-3 text-blue-600" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal de Cálculo de Desconto */}
      <Dialog open={isDiscountModalOpen} onOpenChange={setIsDiscountModalOpen}>
        <DialogContent
          className={`
          ${
            isMobile
              ? "w-[95vw] max-w-[95vw] h-[95vh] max-h-[95vh] m-2"
              : "max-w-md max-h-[90vh]"
          }
          overflow-y-auto p-6 focus-within:p-6
        `}
        >
          <DialogHeader className={isMobile ? "pb-2" : ""}>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Calculator className="h-5 w-5" />
              Calcular Desconto
            </DialogTitle>
            <DialogDescription className="text-sm">
              Calcule o preço com desconto para este produto
            </DialogDescription>
          </DialogHeader>

          {selectedProduct && (
            <div
              className={`${
                isMobile ? "space-y-3" : "space-y-4"
              } flex-1 overflow-y-auto px-1`}
            >
              {/* Produto Selecionado */}
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className={`${isMobile ? "p-3" : "p-4"}`}>
                  <div className="space-y-2">
                    <div className="font-medium text-blue-900 text-sm sm:text-base">
                      {selectedProduct.product}
                    </div>
                    {selectedProduct.application && (
                      <div className="text-xs sm:text-sm text-blue-700 line-clamp-2">
                        {selectedProduct.application}
                      </div>
                    )}
                    <div
                      className={`flex ${
                        isMobile ? "flex-col gap-1" : "gap-4"
                      } text-xs text-blue-700`}
                    >
                      <span>Estoque: {selectedProduct.stock}</span>
                      <span>Preço: {formatPrice(selectedProduct.price)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Desconto */}
              <div className="space-y-2 px-1">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2 text-sm font-medium">
                    <Percent className="h-4 w-4" />
                    Desconto
                  </Label>
                  {selectedDiscountId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedDiscountId("")}
                      className={`${
                        isMobile ? "h-7 text-xs" : "h-6 text-xs"
                      } text-red-600 hover:text-red-700 hover:bg-red-50 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
                    >
                      Limpar
                    </Button>
                  )}
                </div>
                <Select
                  value={selectedDiscountId}
                  onValueChange={setSelectedDiscountId}
                >
                  <SelectTrigger
                    className={`${
                      isMobile ? "h-12 text-sm" : ""
                    } focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
                  >
                    <SelectValue placeholder="Sem desconto - Clique para selecionar" />
                  </SelectTrigger>
                  <SelectContent
                    className={`${
                      isMobile ? "max-h-[50vh]" : "max-h-[40vh]"
                    } overflow-y-auto`}
                    position="popper"
                    sideOffset={4}
                    align={isMobile ? "center" : "start"}
                  >
                    <div
                      className={`${
                        isMobile ? "max-h-[45vh]" : "max-h-[35vh]"
                      } overflow-y-auto`}
                    >
                      {discounts.map((discount: Discount) => (
                        <SelectItem
                          key={discount.id}
                          value={discount.id}
                          className={isMobile ? "py-3 px-3" : ""}
                        >
                          <div className="flex flex-col gap-1 w-full">
                            <span className="font-medium text-sm">
                              {discount.name}
                            </span>
                            <span className="text-xs text-green-600">
                              Desconto:{" "}
                              {parseFloat(
                                discount.discount_percentage.toString()
                              ).toFixed(2)}
                              %
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </div>
                  </SelectContent>
                </Select>
              </div>

              {/* Resumo do Cálculo */}
              <Card className="border-green-200 bg-green-50">
                <CardContent className="p-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Preço original:</span>
                      <span className="font-mono">
                        {formatPrice(originalPrice)}
                      </span>
                    </div>
                    {discountPercentage > 0 && (
                      <>
                        <div className="flex justify-between text-red-600">
                          <span>
                            Desconto ({discountPercentage.toFixed(2)}%):
                          </span>
                          <span className="font-mono">
                            -{formatPrice(discountAmount)}
                          </span>
                        </div>
                        <hr className="border-green-200" />
                      </>
                    )}
                    <div className="flex justify-between font-bold text-lg text-green-700">
                      <span>Total:</span>
                      <span className="font-mono">
                        {formatPrice(finalPrice)}
                      </span>
                    </div>
                    {discountPercentage > 0 && (
                      <div className="text-center">
                        <Badge
                          variant="secondary"
                          className="bg-green-200 text-green-800"
                        >
                          Economia: {formatPrice(discountAmount)}
                        </Badge>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Botões */}
              <div
                className={`flex gap-2 ${
                  isMobile
                    ? "pt-2 sticky bottom-0 bg-white border-t border-gray-200 -mx-3 px-5 pb-3"
                    : "px-2 py-1"
                }`}
              >
                <Button
                  variant="outline"
                  onClick={handleCloseDiscountModal}
                  className={`flex-1 ${
                    isMobile ? "h-11" : ""
                  } focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
                >
                  <X className="h-4 w-4 mr-2" />
                  Fechar
                </Button>
                <Button
                  onClick={() => {
                    toast.success("Cálculo realizado com sucesso!");
                    handleCloseDiscountModal();
                  }}
                  className={`flex-1 ${
                    isMobile ? "h-11" : ""
                  } focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
                >
                  <Calculator className="h-4 w-4 mr-2" />
                  OK
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
