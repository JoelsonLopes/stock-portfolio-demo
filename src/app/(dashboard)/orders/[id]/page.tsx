"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OrderForm } from "@/presentation/components/orders/OrderForm";
import type { OrderFormData } from "@/presentation/types/order.types";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

// Definição dos status disponíveis
const ORDER_STATUS_OPTIONS = [
  { value: "draft", label: "Rascunho" },
  { value: "confirmed", label: "Confirmado" },
  { value: "processing", label: "Processando" },
  { value: "shipped", label: "Enviado" },
  { value: "delivered", label: "Entregue" },
  { value: "cancelled", label: "Cancelado" },
];

interface OrderData {
  id: string;
  order_number: string;
  client_id: string; // ✅ UUID como string
  payment_condition_id: string;
  notes: string;
  status: string;
  total: number;
  shipping_rate: number;
  created_at: string;
  clients: {
    id: string; // ✅ UUID como string
    code: string;
    client: string;
    city?: string;
  };
  payment_conditions: {
    id: string;
    name: string;
  };
  order_items: Array<{
    id: string;
    product_id: number; // BIGINT do PostgreSQL
    product_code?: string;
    product_name?: string;
    quantity: number;
    unit_price: number;
    original_unit_price: number;
    discount_id?: string;
    discount_percentage: number;
    discount_amount: number;
    total_price: number;
    commission_percentage: number;
    client_ref?: string;
    pending_quantity?: number; // 🔥 NOVO: Campo de pendência
    has_pending?: boolean; // 🔥 NOVO: Flag de pendência
    products?: {
      id: number; // BIGINT do PostgreSQL
      product: string;
      price: number;
      stock: number;
      application?: string;
      group_id?: number | null;
      product_groups?: { name?: string | null } | null;
    };
  }>;
}

export default function OrderDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const orderId = params.id as string;

  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStatus, setCurrentStatus] = useState<string>("");

  // Carregar dados do pedido
  useEffect(() => {
    const fetchOrder = async () => {
      try {
        setIsLoading(true);

        const response = await fetch(`/api/orders/${orderId}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Pedido não encontrado");
        }

        const data = await response.json();

        // A API retorna { order: ... }, então precisamos acessar a propriedade order
        const orderData = data.order || data;

        setOrderData(orderData);
        setCurrentStatus(orderData.status);
      } catch (error) {
        console.error("Erro ao carregar pedido:", error);
        setError(
          error instanceof Error ? error.message : "Erro ao carregar pedido"
        );
        toast.error("Erro ao carregar dados do pedido");
      } finally {
        setIsLoading(false);
      }
    };

    if (orderId) {
      fetchOrder();
    }
  }, [orderId]);

  const handleSave = async (formData: OrderFormData) => {
    try {
      setIsSaving(true);

      const response = await fetch(`/api/orders/${orderId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Erro ao salvar pedido");
      }

      toast.success("Pedido atualizado com sucesso!");

      // Invalidar cache para forçar recarregamento da lista
      await queryClient.invalidateQueries({ queryKey: ["orders"] });

      router.push("/orders");
    } catch (error) {
      console.error("Erro ao salvar pedido:", error);
      toast.error("Erro ao salvar pedido");
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    router.push("/orders");
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (!orderData || newStatus === orderData.status) return;

    try {
      setIsUpdatingStatus(true);

      const response = await fetch(`/api/orders/${orderId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: newStatus,
        }),
      });

      if (!response.ok) {
        throw new Error("Erro ao atualizar status");
      }

      // Atualizar estado local
      setOrderData((prev) => (prev ? { ...prev, status: newStatus } : null));
      setCurrentStatus(newStatus);

      // Invalidar cache para atualizar lista de pedidos
      await queryClient.invalidateQueries({ queryKey: ["orders"] });

      toast.success("Status atualizado com sucesso!");
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      toast.error("Erro ao atualizar status");
      // Reverter status no campo
      setCurrentStatus(orderData.status);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-muted-foreground">Carregando pedido...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !orderData) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/orders")}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              <CardTitle>Erro ao carregar pedido</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                {error || "Pedido não encontrado"}
              </p>
              <Button onClick={() => router.push("/orders")}>
                Voltar para lista de pedidos
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Converter dados do pedido para o formato esperado pelo formulário
  const initialFormData: Partial<OrderFormData> & {
    id?: string;
    client?: any;
    order_number?: string;
    status?: string;
  } = {
    id: orderData.id, // ✅ ADICIONADO: ID do pedido para permitir adicionar em lote
    client_id: orderData.client_id,
    payment_condition_id: orderData.payment_condition_id,
    notes: orderData.notes,
    shipping_rate: orderData.shipping_rate || 0,
    order_number: orderData.order_number,
    status: orderData.status,
    client: orderData.clients, // Passar dados do cliente para evitar busca adicional
    items: (orderData.order_items || []).map((item) => ({
      id: item.id,
      product_id: item.product_id,
      product_code: item.product_code,
      product_name: item.products?.product || "", // ✅ CORREÇÃO: Mapear nome do produto corretamente
      product_group_name: item.products?.product_groups?.name || undefined,
      quantity: item.quantity,
      unit_price: item.unit_price,
      original_unit_price:
        item.original_unit_price || item.products?.price || 0, // ✅ CORREÇÃO: Usar preço do produto como fallback
      discount_id: item.discount_id,
      discount_percentage: item.discount_percentage,
      discount_amount: item.discount_amount,
      total_price: item.total_price,
      commission_percentage: item.commission_percentage,
      client_ref: item.client_ref,
      pending_quantity: item.pending_quantity || 0, // 🔥 NUEVO: Incluir pendência
      has_pending: item.has_pending || false, // 🔥 NUEVO: Flag de pendência
      created_at: (item as any).created_at || new Date().toISOString(),
      updated_at: (item as any).updated_at || new Date().toISOString(),
    })),
  };

  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-7xl">
      <Card className="mb-6">
        <CardHeader className="space-y-4">
          {/* Header principal - sempre em linha única */}
          <div className="flex items-center gap-2 sm:gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/orders")}
              className="shrink-0"
            >
              <ArrowLeft className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Voltar</span>
            </Button>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-lg sm:text-xl truncate">
                Editar Pedido
              </CardTitle>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">
                Pedido #{orderData.order_number} •{" "}
                {new Date(orderData.created_at).toLocaleDateString("pt-BR")}
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      <OrderForm
        initialData={initialFormData}
        onSave={handleSave}
        onCancel={handleCancel}
        isLoading={isSaving}
      />
    </div>
  );
}
