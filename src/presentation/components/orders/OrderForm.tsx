"use client";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type {
  OrderFormData,
  OrderItem,
  PaymentCondition,
} from "@/presentation/types/order.types";
import { SessionManager } from "@/shared/infrastructure/session/session-manager";
import { useQuery } from "@tanstack/react-query";
import {
  Calculator,
  FileDown,
  FileText,
  Package,
  Plus,
  Save,
  Truck,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AddProductFlow } from "./AddProductFlow";
import { BulkAddProductsFlow } from "./BulkAddProductsFlow";
import { ClientSelector } from "./ClientSelector";
import { OrderItemsTable } from "./OrderItemsTable";
import { saveToPDF, type OrderPrintData } from "./OrderPrintTemplate";

// Definição dos status disponíveis
const ORDER_STATUS_OPTIONS = [
  { value: "draft", label: "Rascunho" },
  { value: "confirmed", label: "Confirmado" },
  { value: "processing", label: "Processando" },
  { value: "shipped", label: "Enviado" },
  { value: "delivered", label: "Entregue" },
  { value: "cancelled", label: "Cancelado" },
];

interface OrderFormProps {
  initialData?: Partial<OrderFormData> & {
    id?: string;
    client?: any;
    order_number?: string;
    status?: string;
  };
  onSave: (data: OrderFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function OrderForm({
  initialData,
  onSave,
  onCancel,
  isLoading = false,
}: OrderFormProps) {
  const [formData, setFormData] = useState<OrderFormData>({
    client_id: initialData?.client_id || null,
    payment_condition_id: initialData?.payment_condition_id || null,
    notes: initialData?.notes || "",
    items: initialData?.items || [],
    shipping_rate: initialData?.shipping_rate || 0,
    status: initialData?.status || "draft", // Status padrão é 'draft' para pedidos novos
  });

  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [showClientSelector, setShowClientSelector] = useState(false);
  const [showAddProductFlow, setShowAddProductFlow] = useState(false);
  const [showBulkAddFlow, setShowBulkAddFlow] = useState(false);
  const [shippingRate, setShippingRate] = useState<number>(0);

  // Ref para o botão "Adicionar Produto"
  const addProductButtonRef = useRef<HTMLButtonElement>(null);

  // Definir dados iniciais se fornecidos (apenas na primeira carga)
  useEffect(() => {
    if (initialData?.client) {
      setSelectedClient(initialData.client);
      // Sincronizar o client_id também
      setFormData((prev) => ({ ...prev, client_id: initialData.client.id }));
    }

    // Carregar shipping_rate se fornecido
    if (initialData?.shipping_rate !== undefined) {
      setShippingRate(initialData.shipping_rate);
    }
  }, [initialData?.client, initialData?.shipping_rate]);

  // Detectar tecla Esc para fechar modal de cliente
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (showClientSelector) {
          setShowClientSelector(false);
        }
      }
    };

    if (showClientSelector) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showClientSelector]);

  // Buscar condições de pagamento
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

  // Cálculos dos totais com memoização para performance
  const { subtotal, totalPieces, totalCommission } = useMemo(() => {
    const items = formData.items || [];

    // ✅ CORREÇÃO: Calcular dinamicamente (quantity * unit_price)
    const subtotal = items.reduce((sum, item) => {
      const itemTotal = (item.quantity || 0) * (item.unit_price || 0);
      return sum + itemTotal;
    }, 0);

    const totalPieces = items.reduce(
      (sum, item) => sum + (item.quantity || 0),
      0
    );

    const totalCommission = items.reduce((sum, item) => {
      const itemTotal = (item.quantity || 0) * (item.unit_price || 0);
      const itemCommission =
        (itemTotal * (item.commission_percentage || 0)) / 100;
      return sum + itemCommission;
    }, 0);

    return { subtotal, totalPieces, totalCommission };
  }, [formData.items]);

  // Resumo de peças por grupo
  const groupPiecesSummary = useMemo(() => {
    const items = formData.items || [];
    const groupNameToQuantity: Record<string, number> = {};

    for (const item of items) {
      const groupName = (item.product_group_name || "Sem grupo").trim();
      const quantity = Number(item.quantity || 0);
      groupNameToQuantity[groupName] = (groupNameToQuantity[groupName] || 0) + quantity;
    }

    return Object.entries(groupNameToQuantity)
      .sort(([a], [b]) => a.localeCompare(b, "pt-BR"));
  }, [formData.items]);

  const total = subtotal + shippingRate;

  // Validação reativa do formulário para feedback visual
  const formValidation = useMemo(() => {
    const hasClient = !!formData.client_id;
    const hasPaymentCondition = !!formData.payment_condition_id;
    const hasItems = formData.items.length > 0;

    const isValid = hasClient && hasPaymentCondition && hasItems;

    const missingFields = [];
    if (!hasClient) missingFields.push("Cliente");
    if (!hasPaymentCondition) missingFields.push("Condição de Pagamento");
    if (!hasItems) missingFields.push("Itens do Pedido");

    return {
      isValid,
      missingFields,
      errorMessage:
        missingFields.length > 0
          ? `Campos obrigatórios: ${missingFields.join(", ")}`
          : "",
    };
  }, [
    formData.client_id,
    formData.payment_condition_id,
    formData.items.length,
  ]);

  const handleClientSelect = (client: any) => {
    setSelectedClient(client);
    // Client ID é UUID (string), não converter para número
    setFormData((prev) => ({ ...prev, client_id: client.id }));
    setShowClientSelector(false);
  };

  const handleAddProduct = (item: OrderItem) => {
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, item],
    }));
    setShowAddProductFlow(false);

    // Focar no botão "Adicionar Produto" após adicionar um item
    setTimeout(() => {
      addProductButtonRef.current?.focus();
    }, 100);
  };

  const handleBulkAddSuccess = (items?: OrderItem[]) => {
    setShowBulkAddFlow(false);

    if (initialData?.id) {
      // Pedido existente - recarregar página
      toast.success(
        "Produtos adicionados ao pedido! A página será recarregada."
      );
      window.location.reload();
    } else if (items && items.length > 0) {
      // Pedido novo - adicionar items ao estado local
      setFormData((prev) => ({
        ...prev,
        items: [...prev.items, ...items],
      }));
      toast.success(`${items.length} produto(s) adicionado(s) ao pedido!`);
    }
  };

  const handleItemUpdate = (itemId: string, updates: Partial<OrderItem>) => {
    setFormData((prev) => {
      const newItems = prev.items.map((item) => {
        if (item.id === itemId) {
          const updatedItem = { ...item, ...updates };

          // Recalcular totais quando quantidade, preço ou desconto mudam
          if (
            "quantity" in updates ||
            "unit_price" in updates ||
            "discount_percentage" in updates
          ) {
            const quantity = updatedItem.quantity;
            const discountPercentage = updatedItem.discount_percentage;

            // Se APENAS o desconto mudou (sem edição manual de preço), recalcular unit_price
            if (
              "discount_percentage" in updates &&
              !("unit_price" in updates)
            ) {
              const discountAmount =
                (updatedItem.original_unit_price * discountPercentage) / 100;
              updatedItem.unit_price =
                updatedItem.original_unit_price - discountAmount;
            }

            // Calcular totais sempre baseado no unit_price final (manual ou calculado)
            const unitPrice = updatedItem.unit_price;
            const totalPrice = quantity * unitPrice;

            // Calcular discount_amount baseado na diferença entre original e atual
            const discountAmountTotal =
              quantity * (updatedItem.original_unit_price - unitPrice);

            updatedItem.discount_amount =
              discountAmountTotal > 0 ? discountAmountTotal : 0;
            updatedItem.total_price = Number(totalPrice.toFixed(2));

            // ✅ Garantir sincronização do total_price
            updatedItem.total_price = Number((quantity * unitPrice).toFixed(2));
          }

          return updatedItem;
        }
        return item;
      });

      return {
        ...prev,
        items: newItems,
      };
    });
  };

  const handleItemRemove = (itemId: string) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== itemId),
    }));
  };

  const handleSubmit = async () => {
    if (!formValidation.isValid) {
      toast.error("Por favor, preencha todos os campos obrigatórios");
      return;
    }

    try {
      await onSave(formData);
    } catch (error) {
      console.error(error);
    }
  };

  // ✅ FUNÇÃO: Salvar PDF
  const handleSavePDF = async () => {
    if (!selectedClient) {
      toast.error("Selecione um cliente para gerar PDF");
      return;
    }

    if (formData.items.length === 0) {
      toast.error("Adicione pelo menos um item para gerar PDF");
      return;
    }

    // Buscar condição de pagamento selecionada
    const selectedPaymentCondition = paymentConditions.find(
      (condition: PaymentCondition) =>
        condition.id === formData.payment_condition_id
    );

    if (!selectedPaymentCondition) {
      toast.error("Selecione uma condição de pagamento para gerar PDF");
      return;
    }

    try {
      // Obter usuário atual da sessão
      const currentUser = SessionManager.getCurrentUser();
      const userName = currentUser?.name || "Usuário não informado";

      // Preparar dados para PDF (mesmos dados da impressão)
      const printData: OrderPrintData = {
        orderNumber: initialData?.order_number,
        userName: userName,
        orderStatus: initialData?.status,
        client: selectedClient,
        paymentCondition: selectedPaymentCondition,
        items: formData.items,
        notes: formData.notes,
        discounts: discountsForPrint,
        totals: {
          totalPieces,
          subtotal,
          totalCommission,
          shippingRate,
          total,
        },
      };

      // Usar a nova função de salvar PDF
      await saveToPDF(printData);
      toast.success("PDF gerado com sucesso!");
    } catch (error) {
      toast.error("Erro ao gerar PDF");
      console.error(error);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Indicador de Progresso */}
      {!formValidation.isValid && (
        <Card className="border-yellow-200 bg-yellow-50/50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm">
              <div className="flex items-center gap-1">
                <div
                  className={`w-2 h-2 rounded-full ${
                    formData.client_id ? "bg-green-500" : "bg-red-400"
                  }`}
                />
                <span
                  className={
                    formData.client_id ? "text-green-700" : "text-red-600"
                  }
                >
                  Cliente
                </span>
              </div>
              <div className="flex items-center gap-1">
                <div
                  className={`w-2 h-2 rounded-full ${
                    formData.payment_condition_id
                      ? "bg-green-500"
                      : "bg-red-400"
                  }`}
                />
                <span
                  className={
                    formData.payment_condition_id
                      ? "text-green-700"
                      : "text-red-600"
                  }
                >
                  Pagamento
                </span>
              </div>
              <div className="flex items-center gap-1">
                <div
                  className={`w-2 h-2 rounded-full ${
                    formData.items.length > 0 ? "bg-green-500" : "bg-red-400"
                  }`}
                />
                <span
                  className={
                    formData.items.length > 0
                      ? "text-green-700"
                      : "text-red-600"
                  }
                >
                  Itens
                </span>
              </div>
            </div>
            <p className="text-xs text-yellow-700 mt-2">
              Complete todos os campos obrigatórios para salvar o pedido
            </p>
          </CardContent>
        </Card>
      )}

      {/* Cabeçalho do Pedido */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
            Dados do Pedido
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Cliente */}
          <div className="space-y-2">
            <Label className={!formData.client_id ? "text-red-600" : ""}>
              Cliente *
              {!formData.client_id && (
                <span className="text-xs text-red-500 ml-1">(obrigatório)</span>
              )}
            </Label>
            {selectedClient ? (
              <div className="space-y-3">
                <div className="flex items-start gap-2 p-3 border rounded-lg bg-muted/50">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">
                      {selectedClient.client}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {selectedClient.code} • {selectedClient.city}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedClient(null);
                      setFormData((prev) => ({ ...prev, client_id: null }));
                    }}
                    title="Remover cliente"
                    className="shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowClientSelector(true)}
                  className="w-full sm:w-auto text-xs"
                >
                  Trocar Cliente
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                onClick={() => setShowClientSelector(true)}
                className="w-full justify-start"
              >
                <Plus className="h-4 w-4 mr-2" />
                Selecionar Cliente
              </Button>
            )}
          </div>

          {/* Condição de Pagamento */}
          <div className="space-y-2">
            <Label
              className={!formData.payment_condition_id ? "text-red-600" : ""}
            >
              Condição de Pagamento *
              {!formData.payment_condition_id && (
                <span className="text-xs text-red-500 ml-1">(obrigatório)</span>
              )}
            </Label>
            <Select
              value={formData.payment_condition_id || ""}
              onValueChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  payment_condition_id: value,
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma condição de pagamento" />
              </SelectTrigger>
              <SelectContent>
                {paymentConditions.map((condition: PaymentCondition) => (
                  <SelectItem key={condition.id} value={condition.id}>
                    <div className="flex items-center gap-2">
                      <span>{condition.name}</span>
                      {condition.is_cash && (
                        <Badge variant="secondary" className="text-xs">
                          À Vista
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status do Pedido */}
          <div className="space-y-2">
            <Label>Status do Pedido</Label>
            <Select
              value={formData.status || "draft"}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, status: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o status" />
              </SelectTrigger>
              <SelectContent>
                {ORDER_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              placeholder="Observações sobre o pedido..."
              value={formData.notes}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, notes: e.target.value }))
              }
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Itens do Pedido */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle
              className={`flex items-center gap-2 text-lg ${
                formData.items.length === 0 ? "text-red-600" : ""
              }`}
            >
              <Users className="h-4 w-4 sm:h-5 sm:w-5" />
              Itens do Pedido
              {formData.items.length === 0 && (
                <span className="text-xs text-red-500 ml-1 font-normal">
                  (obrigatório)
                </span>
              )}
            </CardTitle>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Button
                ref={addProductButtonRef}
                variant="outline"
                onClick={() => setShowAddProductFlow(true)}
                className="flex items-center gap-2 w-full sm:w-auto"
                size="sm"
              >
                <Plus className="h-4 w-4" />
                <span className="sm:hidden">Adicionar</span>
                <span className="hidden sm:inline">Adicionar Produto</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowBulkAddFlow(true)}
                className="flex items-center gap-2 w-full sm:w-auto"
                size="sm"
              >
                <Package className="h-4 w-4" />
                <span className="sm:hidden">Em Lote</span>
                <span className="hidden sm:inline">Adicionar em Lote</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {formData.items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground border-2 border-dashed border-red-200 rounded-lg bg-red-50/50">
              <Package className="h-8 w-8 mx-auto mb-2 text-red-400" />
              <p className="text-sm font-medium text-red-600">
                Nenhum item adicionado
              </p>
              <p className="text-xs text-red-500">
                Adicione pelo menos um produto para continuar
              </p>
            </div>
          ) : (
            <OrderItemsTable
              items={formData.items}
              onItemUpdate={handleItemUpdate}
              onItemRemove={handleItemRemove}
            />
          )}
        </CardContent>
      </Card>

      {/* Totais */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calculator className="h-4 w-4 sm:h-5 sm:w-5" />
            Totais do Pedido
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between text-sm sm:text-base">
              <span>Total de Peças:</span>
              <span className="font-mono">
                {new Intl.NumberFormat("pt-BR").format(totalPieces)}
              </span>
            </div>
            {/* Resumo por grupo */}
            {groupPiecesSummary.length > 0 && (
              <div className="mt-1">
                <div className="text-xs text-muted-foreground mb-1">Peças por grupo</div>
                <div className="space-y-1">
                  {groupPiecesSummary.map(([group, qty]) => (
                    <div key={group} className="flex justify-between text-xs sm:text-sm">
                      <span className="truncate pr-2">{group}</span>
                      <span className="font-mono">{new Intl.NumberFormat("pt-BR").format(qty)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex justify-between text-sm sm:text-base">
              <span>Subtotal:</span>
              <span className="font-mono">
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(subtotal)}
              </span>
            </div>

            <div className="flex justify-between text-green-600 text-sm sm:text-base">
              <span>Total Comissão:</span>
              <span className="font-mono">
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(Number(totalCommission.toFixed(2)))}
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 text-blue-600">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4" />
                <span className="text-sm sm:text-base">Taxa de Frete:</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">R$</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={shippingRate}
                  onChange={(e) => setShippingRate(Number(e.target.value) || 0)}
                  className="w-20 sm:w-24 h-8 text-right font-mono text-sm [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                  placeholder="0,00"
                />
              </div>
            </div>
            <div className="flex justify-between text-base sm:text-lg font-bold border-t pt-3">
              <span>Total Final:</span>
              <span className="font-mono">
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(total)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ações */}
      <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 sm:gap-4">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
          className="w-full sm:w-auto"
        >
          Cancelar
        </Button>
        <Button
          variant="outline"
          onClick={handleSavePDF}
          disabled={isLoading || !selectedClient || formData.items.length === 0}
          className="flex items-center justify-center gap-2 w-full sm:w-auto"
        >
          <FileDown className="h-4 w-4" />
          <span className="sm:hidden">PDF</span>
          <span className="hidden sm:inline">Salvar PDF</span>
        </Button>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={handleSubmit}
                disabled={isLoading || !formValidation.isValid}
                variant={
                  !formValidation.isValid && !isLoading
                    ? "secondary"
                    : "default"
                }
                className={`flex items-center justify-center gap-2 w-full sm:w-auto ${
                  !formValidation.isValid && !isLoading
                    ? "opacity-60 cursor-not-allowed hover:opacity-60"
                    : ""
                }`}
              >
                <Save className="h-4 w-4" />
                {isLoading ? (
                  "Salvando..."
                ) : (
                  <>
                    <span className="sm:hidden">Salvar</span>
                    <span className="hidden sm:inline">Salvar Pedido</span>
                  </>
                )}
              </Button>
            </TooltipTrigger>
            {!formValidation.isValid && !isLoading && (
              <TooltipContent>
                <p className="text-sm font-medium">Não é possível salvar</p>
                <p className="text-xs text-muted-foreground">
                  {formValidation.errorMessage}
                </p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Modais */}
      <Dialog
        open={showClientSelector}
        onOpenChange={(open) => !open && setShowClientSelector(false)}
      >
        <DialogContent className="max-w-[95vw] sm:max-w-7xl h-[95vh] sm:max-h-[90vh] flex flex-col">
          <DialogHeader className="pb-4 flex-shrink-0">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Users className="h-4 w-4 sm:h-5 sm:w-5" />
              Selecionar Cliente
            </DialogTitle>
            <DialogDescription className="text-sm">
              Busque e selecione um cliente para o pedido
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 min-h-0">
            <ClientSelector onSelect={handleClientSelect} />
          </div>
        </DialogContent>
      </Dialog>

      {/* Novo Fluxo de Produtos */}
      <AddProductFlow
        isOpen={showAddProductFlow}
        onClose={() => setShowAddProductFlow(false)}
        onAdd={handleAddProduct}
      />

      {/* Adicionar Produtos em Lote */}
      <BulkAddProductsFlow
        isOpen={showBulkAddFlow}
        onClose={() => setShowBulkAddFlow(false)}
        onSuccess={handleBulkAddSuccess}
        orderId={initialData?.id || ""} // Para pedidos existentes
      />
    </div>
  );
}
