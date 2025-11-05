"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LoadingSpinner } from "@/shared/presentation/components/ui/loading-spinner";
import {
  AlertCircle,
  Edit,
  FileCheck,
  FileDown,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { OrderStatusBadge } from "./OrderStatusBadge";

interface Order {
  id: string;
  order_number: string;
  status:
    | "draft"
    | "confirmed"
    | "processing"
    | "shipped"
    | "delivered"
    | "cancelled";
  subtotal: number;
  total_discount: number;
  total_commission: number;
  total: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  clients: {
    id: number;
    code: string;
    client: string;
  };
  payment_conditions: {
    id: string;
    name: string;
  };
  order_items: {
    quantity: number;
  }[];
}

interface OrderListProps {
  orders: Order[];
  loading?: boolean;
  hasSearched: boolean;
  searchQuery: string;
  error?: any;
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onEdit?: (orderId: string) => void;
  onDelete?: (orderId: string) => void;
  onSavePDF?: (orderId: string) => void;
  onCompareXML?: (orderId: string) => void;
  onNewOrder?: () => void;
}

export function OrderList({
  orders,
  loading,
  hasSearched,
  searchQuery,
  error,
  total,
  page,
  pageSize,
  onPageChange,
  onEdit,
  onDelete,
  onSavePDF,
  onCompareXML,
  onNewOrder,
}: OrderListProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dateString));
  };

  const getTotalPieces = (order: Order) => {
    try {
      return (
        order.order_items?.reduce((total, item) => total + item.quantity, 0) ||
        0
      );
    } catch (error) {
      return 0;
    }
  };

  const totalPages = Math.ceil(total / pageSize);
  const showPagination = total > pageSize;

  // Loading state
  if (loading) {
    return (
      <Card>
        <CardHeader className="px-4 sm:px-6">
          <CardTitle>Pedidos</CardTitle>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <LoadingSpinner size="lg" className="mx-auto mb-4" />
              <p className="text-gray-600">Carregando pedidos...</p>
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
          <CardTitle>Pedidos</CardTitle>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Erro ao carregar pedidos: {error.message || "Erro desconhecido"}
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
          <div className="flex items-center justify-between">
            <CardTitle>Pedidos</CardTitle>
            {onNewOrder && (
              <Button onClick={onNewOrder} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Novo Pedido
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Search className="h-12 w-12 sm:h-16 sm:w-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">
              Nenhuma busca realizada
            </h3>
            <p className="text-gray-500 max-w-md text-sm sm:text-base">
              Use o formulário acima para buscar pedidos ou aplique filtros para
              ver os resultados.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // No results found
  if (hasSearched && orders.length === 0) {
    return (
      <Card>
        <CardHeader className="px-4 sm:px-6">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Resultados da Busca</CardTitle>
              <div className="text-sm text-gray-600 mt-1">
                {searchQuery ? (
                  <>
                    Busca por:{" "}
                    <strong className="break-all">"{searchQuery}"</strong>
                  </>
                ) : (
                  "Filtros aplicados"
                )}
              </div>
            </div>
            {onNewOrder && (
              <Button onClick={onNewOrder} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Novo Pedido
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <ShoppingCart className="h-12 w-12 sm:h-16 sm:w-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">
              Nenhum pedido encontrado
            </h3>
            <p className="text-gray-500 max-w-md text-sm sm:text-base">
              Não foram encontrados pedidos que correspondam aos critérios de
              busca. Tente ajustar os filtros ou criar um novo pedido.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Results found
  return (
    <Card>
      <CardHeader className="px-4 sm:px-6">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Resultados da Busca</CardTitle>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="text-sm text-gray-600">
                <strong>{total}</strong> pedido{total !== 1 ? "s" : ""}{" "}
                encontrado
                {total !== 1 ? "s" : ""}
                {searchQuery && (
                  <>
                    {" "}
                    para: <strong className="break-all">"{searchQuery}"</strong>
                  </>
                )}
              </div>
              {showPagination && (
                <div className="text-xs text-gray-500">
                  Página {page} de {totalPages} • Mostrando {orders.length} de{" "}
                  {total}
                </div>
              )}
            </div>
          </div>
          {onNewOrder && (
            <Button onClick={onNewOrder} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Novo Pedido
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Nº Pedido</TableHead>
                <TableHead className="w-[120px]">Status</TableHead>
                <TableHead className="min-w-[200px]">Cliente</TableHead>
                {!isMobile && <TableHead className="w-[140px]">Data</TableHead>}
                <TableHead className="text-right w-[120px]">Total</TableHead>
                <TableHead className="text-center w-[80px]">Peças</TableHead>
                <TableHead className="text-center w-[160px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id} className="hover:bg-gray-50">
                  <TableCell className="font-mono text-sm">
                    {order.order_number}
                  </TableCell>
                  <TableCell>
                    <OrderStatusBadge status={order.status} />
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium text-sm">
                        {order.clients.client}
                      </div>
                      <div className="text-xs text-gray-500">
                        Cód: {order.clients.code}
                      </div>
                    </div>
                  </TableCell>
                  {!isMobile && (
                    <TableCell className="text-sm">
                      {formatDate(order.created_at)}
                    </TableCell>
                  )}
                  <TableCell className="text-right">
                    <div className="space-y-1">
                      <div className="font-semibold">
                        {formatCurrency(order.total)}
                      </div>
                      {/* Verificação mais robusta para total_commission */}
                      {order.total_commission &&
                        Number(order.total_commission) > 0 && (
                          <div className="text-xs text-gray-500">
                            Comissão:{" "}
                            {formatCurrency(Number(order.total_commission))}
                          </div>
                        )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="font-mono text-sm font-medium ">
                      {getTotalPieces(order)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-1">
                      {onSavePDF && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onSavePDF(order.id)}
                          className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          title="Salvar como PDF"
                        >
                          <FileDown className="h-4 w-4" />
                        </Button>
                      )}
                      {onCompareXML &&
                        (order.status === "confirmed" ||
                          order.status === "processing" ||
                          order.status === "shipped" ||
                          order.status === "delivered") && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onCompareXML(order.id)}
                            className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                            title="Comparar com XML da Nota Fiscal"
                          >
                            <FileCheck className="h-4 w-4" />
                          </Button>
                        )}
                      {onEdit &&
                        (order.status === "draft" ||
                          order.status === "confirmed") && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEdit(order.id)}
                            className={`h-8 w-8 p-0 ${
                              order.status === "confirmed"
                                ? "text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                : ""
                            }`}
                            title={
                              order.status === "draft"
                                ? "Editar Rascunho"
                                : "Editar Pedido Confirmado - Adicionar/Remover produtos"
                            }
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                      {onDelete &&
                        (order.status === "draft" ||
                          order.status === "confirmed") && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDelete(order.id)}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            title={
                              order.status === "draft"
                                ? "Excluir Rascunho"
                                : "Excluir Pedido Confirmado"
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Paginação */}
        {showPagination && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <div className="text-sm text-gray-500">
              Mostrando {(page - 1) * pageSize + 1} a{" "}
              {Math.min(page * pageSize, total)} de {total} pedidos
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1}
              >
                Anterior
              </Button>
              <span className="text-sm font-medium">
                {page} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(page + 1)}
                disabled={page >= totalPages}
              >
                Próxima
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
