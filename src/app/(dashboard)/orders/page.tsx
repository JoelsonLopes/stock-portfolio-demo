"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OrderList } from "@/presentation/components/orders/OrderList";
import {
  saveToPDF,
  type OrderPrintData,
} from "@/presentation/components/orders/OrderPrintTemplate";
import {
  OrderSearchForm,
  type OrderSearchFilters,
} from "@/presentation/components/orders/OrderSearchForm";
import { XMLComparisonModal } from "@/presentation/components/orders/XMLComparisonModal";
import { useOrderSearch } from "@/presentation/hooks/useOrderSearch";
import { SessionManager } from "@/shared/infrastructure/session/session-manager";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export default function OrdersPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<OrderSearchFilters>({
    query: "",
    status: "",
    clientId: "",
    dateFrom: "",
    dateTo: "",
  });
  const [hasSearched, setHasSearched] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 4;

  // Estados para o modal de comparação XML
  const [showXMLModal, setShowXMLModal] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string>("");
  const [selectedOrderData, setSelectedOrderData] = useState<any>(null);

  // Carregar os últimos pedidos automaticamente
  const { data, isLoading, error, refetch } = useOrderSearch({
    query: filters.query,
    status: filters.status || undefined,
    clientId: filters.clientId || undefined,
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
    page,
    pageSize,
    enabled: true,
  });

  // Buscar condições de pagamento para impressão
  const { data: paymentConditions = [] } = useQuery({
    queryKey: ["payment-conditions", "active"],
    queryFn: async () => {
      const response = await fetch("/api/payment-conditions?active=true");
      if (!response.ok)
        throw new Error("Erro ao buscar condições de pagamento");
      return response.json();
    },
  });

  // Buscar descontos para impressão
  const { data: discountsResponse } = useQuery({
    queryKey: ["discounts", "active"],
    queryFn: async () => {
      const response = await fetch("/api/discounts?active=true");
      if (!response.ok) throw new Error("Erro ao buscar descontos");
      return response.json();
    },
  });

  const discountsForPrint = Array.isArray(discountsResponse?.data)
    ? discountsResponse.data
    : [];

  const handleSearch = (newFilters: OrderSearchFilters) => {
    setFilters(newFilters);
    setHasSearched(true);
    setPage(1);
    refetch();
  };

  const handleClearSearch = () => {
    const emptyFilters: OrderSearchFilters = {
      query: "",
      status: "",
      clientId: "",
      dateFrom: "",
      dateTo: "",
    };
    setFilters(emptyFilters);
    setHasSearched(true);
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleNewOrder = () => {
    router.push("/orders/new");
  };

  const handleEditOrder = (orderId: string) => {
    router.push(`/orders/${orderId}`);
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (
      !confirm(
        "Tem certeza que deseja excluir este pedido? Esta ação não pode ser desfeita."
      )
    ) {
      return;
    }

    const loadingToast = toast.loading("Excluindo pedido...");

    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao excluir pedido");
      }

      const result = await response.json();
      toast.dismiss(loadingToast);
      toast.success(`Pedido ${result.orderNumber} excluído com sucesso!`);

      await queryClient.invalidateQueries({ queryKey: ["orders"] });
    } catch (error) {
      console.error("Erro ao excluir pedido:", error);
      toast.dismiss(loadingToast);
      toast.error(
        `Erro ao excluir pedido: ${
          error instanceof Error ? error.message : "Erro desconhecido"
        }`
      );
    }
  };

  // ✅ FUNÇÃO: Salvar PDF - com tratamento defensivo de dados
  const handleSavePDF = async (orderId: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}`);
      if (!response.ok) throw new Error("Erro ao buscar pedido");

      const responseData = await response.json();

      // ✅ A API retorna { order: {...} }
      const orderData = responseData.order || responseData;

      if (!orderData) {
        throw new Error("Dados do pedido não encontrados");
      }

      // ✅ Tratamento defensivo para cliente
      const clientData = orderData.clients || orderData.client;
      if (!clientData) {
        throw new Error("Dados do cliente não encontrados");
      }

      // ✅ Tratamento defensivo para condição de pagamento
      const paymentConditionData =
        orderData.payment_conditions || orderData.payment_condition;
      if (!paymentConditionData) {
        throw new Error("Condição de pagamento não encontrada");
      }

      // ✅ Preparar itens com informações completas
      const items = (orderData.order_items || orderData.items || []).map(
        (item: any) => ({
          id: item.id,
          product_id: item.product_id,
          product_code:
            item.products?.product || item.product_code || "",
          product_name: item.products?.product || "Produto não informado",
          product_group_name:
            item.products?.product_groups?.name || item.product_group_name || "",
          quantity: item.quantity || 0,
          unit_price: item.unit_price || 0,
          original_unit_price: item.original_unit_price || item.unit_price || 0,
          discount_percentage: item.discount_percentage || 0,
          discount_name: item.discounts?.name || "",
          commission_percentage: item.commission_percentage || 0,
          client_ref: item.client_ref || "",
          pending_quantity: item.pending_quantity || 0, // 🔥 NOVO: Incluir pendência
          has_pending: item.has_pending || false, // 🔥 NOVO: Flag de pendência
          created_at: item.created_at,
          updated_at: item.updated_at,
        })
      );

      // Obter usuário atual da sessão
      const currentUser = SessionManager.getCurrentUser();
      const userName = currentUser?.name || "Usuário não informado";

      // ✅ Preparar dados para PDF com estrutura defensiva
      const printData: OrderPrintData = {
        orderNumber: orderData.order_number,
        userName: userName,
        orderStatus: orderData.status,
        client: {
          code: clientData.code || "N/A",
          client: clientData.client || "Cliente não informado",
          city: clientData.city || "",
        },
        paymentCondition: {
          id: paymentConditionData.id,
          name: paymentConditionData.name || "Não informado",
          description: paymentConditionData.description || "",
          installments: paymentConditionData.installments || 1,
          is_cash: paymentConditionData.is_cash || false,
        },
        items: items,
        notes: orderData.notes || "",
        totals: {
          totalPieces: items.reduce(
            (sum: number, item: any) => sum + (item.quantity || 0),
            0
          ),
          subtotal: orderData.subtotal || 0,
          totalCommission: orderData.total_commission || 0,
          shippingRate: orderData.shipping_rate || 0,
          total: orderData.total || 0,
        },
        discounts: discountsForPrint, // Usar os descontos já carregados
      };

      await saveToPDF(printData);
      toast.success("PDF gerado com sucesso!");
    } catch (error) {
      console.error("❌ Erro ao gerar PDF:", error);
      toast.error(
        `Erro ao gerar PDF: ${
          error instanceof Error ? error.message : "Erro desconhecido"
        }`
      );
    }
  };

  // ✅ FUNÇÃO: Comparar com XML da Nota Fiscal
  const handleCompareXML = async (orderId: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}`);
      if (!response.ok) throw new Error("Erro ao buscar pedido");

      const responseData = await response.json();
      const orderData = responseData.order || responseData;

      if (!orderData) {
        throw new Error("Dados do pedido não encontrados");
      }

      // Preparar dados do pedido para comparação
      const orderForComparison = {
        order_number: orderData.order_number,
        client_name:
          orderData.clients?.client ||
          orderData.client?.client ||
          "Cliente não informado",
        items: (orderData.order_items || orderData.items || []).map(
          (item: any) => ({
            product_code: item.products?.product || item.product_code || "",
            product_name:
              item.products?.product ||
              item.product_name ||
              "Produto não informado",
            quantity: item.quantity || 0,
            unit_price: item.unit_price || 0,
          })
        ),
      };

      setSelectedOrderId(orderId);
      setSelectedOrderData(orderForComparison);
      setShowXMLModal(true);
    } catch (error) {
      console.error("Erro ao carregar dados do pedido:", error);
      toast.error(
        `Erro ao carregar pedido: ${
          error instanceof Error ? error.message : "Erro desconhecido"
        }`
      );
    }
  };

  const getPageDescription = () => {
    const hasActiveFilters =
      filters.query ||
      filters.status ||
      filters.clientId ||
      filters.dateFrom ||
      filters.dateTo;

    if (hasActiveFilters) {
      return "Resultados da busca aplicada";
    }

    return `Exibindo os ${pageSize} pedidos mais recentes`;
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6 max-w-7xl">
      <Card>
        <CardHeader className="px-4 sm:px-6">
          <div className="flex items-center justify-between">
            <CardTitle>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">
                Meus Últimos Pedidos
              </h1>
              <p className="text-sm text-muted-foreground font-normal">
                {getPageDescription()}
              </p>
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <OrderSearchForm
            onSearch={handleSearch}
            onClear={handleClearSearch}
            isLoading={isLoading}
            currentFilters={filters}
          />
        </CardContent>
      </Card>

      <div className="w-full overflow-hidden rounded-lg">
        <OrderList
          orders={data?.data || []}
          loading={isLoading}
          hasSearched={hasSearched}
          searchQuery={filters.query}
          error={error}
          total={data?.total || 0}
          page={page}
          pageSize={pageSize}
          onPageChange={handlePageChange}
          onNewOrder={handleNewOrder}
          onEdit={handleEditOrder}
          onDelete={handleDeleteOrder}
          onSavePDF={handleSavePDF}
          onCompareXML={handleCompareXML}
        />
      </div>

      {/* Modal de Comparação XML */}
      <XMLComparisonModal
        isOpen={showXMLModal}
        onClose={() => setShowXMLModal(false)}
        orderId={selectedOrderId}
        orderData={selectedOrderData}
      />
    </div>
  );
}
