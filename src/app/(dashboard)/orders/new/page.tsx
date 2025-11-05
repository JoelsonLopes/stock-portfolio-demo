"use client";

import { Button } from "@/components/ui/button";
import { OrderForm } from "@/presentation/components/orders/OrderForm";
import { OrderFormSkeleton } from "@/presentation/components/orders/OrderFormSkeleton";
import { OrderFormData } from "@/presentation/types/order.types";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { Suspense, useState } from "react";
import { toast } from "sonner";

export default function NewOrderPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async (formData: OrderFormData) => {
    setIsLoading(true);
    try {
      // Preparar dados para a API
      const orderData = {
        client_id: formData.client_id,
        payment_condition_id: formData.payment_condition_id,
        notes: formData.notes,
        shipping_rate: formData.shipping_rate || 0,
        status: formData.status || "draft", // ✅ ADICIONADO: Incluir status na criação
        items: formData.items.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          original_unit_price: item.original_unit_price,
          discount_id: item.discount_id, // ✅ ADICIONADO: Preservar discount_id
          discount_percentage: item.discount_percentage || 0,
          discount_amount: item.discount_amount || 0,
          total_price: item.total_price,
          commission_percentage: item.commission_percentage || 0,
          client_ref: item.client_ref || null,
          pending_quantity: item.pending_quantity || 0, // 🔥 NOVO: Incluir pendência
          has_pending: item.has_pending || false, // 🔥 NOVO: Flag de pendência
        })),
      };

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao criar pedido");
      }

      const newOrder = await response.json();

      toast.success(
        `Pedido ${
          newOrder.order_number || newOrder.orderNumber
        } criado com sucesso!`
      );

      // Invalidar cache para forçar recarregamento da lista
      await queryClient.invalidateQueries({ queryKey: ["orders"] });

      router.push(`/orders`);
    } catch (error) {
      console.error("Erro ao salvar pedido:", error);
      toast.error(
        error instanceof Error ? error.message : "Erro ao criar pedido"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.push("/orders");
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => router.push("/orders")}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para Pedidos
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Novo Pedido</h1>
          <p className="text-muted-foreground">
            Crie um novo pedido selecionando cliente, produtos e condições de
            pagamento
          </p>
        </div>
      </div>

      {/* Formulário */}
      <Suspense fallback={<OrderFormSkeleton />}>
        <OrderForm
          onSave={handleSave}
          onCancel={handleCancel}
          isLoading={isLoading}
        />
      </Suspense>
    </div>
  );
}
