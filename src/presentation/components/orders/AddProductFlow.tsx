"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import type { ProductWithEquivalences } from "@/modules/inventory/domain/entities/product-with-equivalences.entity";
import { useIsMobile } from "@/presentation/hooks/use-mobile";
import type { Discount, OrderItem } from "@/presentation/types/order.types";
import { useQuery } from "@tanstack/react-query";
import { Calculator, Check, Hash, Package, Percent, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ProductSearchModal } from "./ProductSearchModal";

interface AddProductFlowProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (item: OrderItem) => void;
}

export function AddProductFlow({
  isOpen,
  onClose,
  onAdd,
}: AddProductFlowProps) {
  // Hook para detectar mobile
  const isMobile = useIsMobile();

  // Estados do fluxo - agora só tem 2 steps: search e details
  const [step, setStep] = useState<"search" | "details">("search");
  const [selectedProduct, setSelectedProduct] =
    useState<ProductWithEquivalences | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [selectedDiscountId, setSelectedDiscountId] = useState<string>("none");
  const [clientRef, setClientRef] = useState<string>("");

  // Refs para foco automático
  const clientRefInputRef = useRef<HTMLInputElement>(null);
  const quantityInputRef = useRef<HTMLInputElement>(null);

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

  // Reset ao abrir/fechar
  useEffect(() => {
    if (isOpen) {
      setStep("search");
      setSelectedProduct(null);
      setQuantity(1);
      setSelectedDiscountId("none");
      setClientRef("");
    }
  }, [isOpen]);

  // Foco automático quando entra no step details
  useEffect(() => {
    if (step === "details" && clientRefInputRef.current) {
      setTimeout(() => {
        clientRefInputRef.current?.focus();
      }, 100);
    }
  }, [step]);

  const handleProductSelect = (product: ProductWithEquivalences) => {
    setSelectedProduct(product);
    setStep("details");
  };

  // Função melhorada para calcular totais
  const calculateTotals = () => {
    if (!selectedProduct)
      return {
        unitPriceWithDiscount: 0,
        itemTotal: 0,
        discountAmount: 0,
        finalPrice: 0,
        discountPercentage: 0,
        commissionPercentage: 0,
      };

    const originalUnitPrice = Number(selectedProduct.price);
    let discountPercentage = 0;
    let commissionPercentage = 0;

    if (selectedDiscountId && selectedDiscountId !== "none") {
      const discount = discounts.find(
        (d: Discount) => d.id === selectedDiscountId
      );
      if (discount) {
        discountPercentage = Number(discount.discount_percentage) || 0;
        commissionPercentage = Number(discount.commission_percentage || 0) || 0;
      }
    }

    // Calcular preço unitário com desconto
    const discountAmountPerUnit =
      (originalUnitPrice * discountPercentage) / 100;
    const unitPriceWithDiscount = Number(
      (originalUnitPrice - discountAmountPerUnit).toFixed(2)
    );

    // Calcular totais
    const itemTotal = quantity * originalUnitPrice;
    const discountAmount = quantity * discountAmountPerUnit;
    const finalPrice = quantity * unitPriceWithDiscount;

    return {
      unitPriceWithDiscount,
      itemTotal,
      discountAmount,
      finalPrice,
      discountPercentage,
      commissionPercentage,
    };
  };

  const handleConfirm = () => {
    if (!selectedProduct) return;

    // Validações
    if (quantity <= 0) {
      toast.error("Quantidade deve ser maior que zero");
      quantityInputRef.current?.focus();
      return;
    }

    // 🔥 NOVA LÓGICA: Calcular pendências baseado no estoque
    const availableStock = Number(selectedProduct.stock);
    let actualQuantity = quantity;
    let pendingQuantity = 0;
    let hasPending = false;

    if (quantity > availableStock) {
      // Se quantidade solicitada é maior que o estoque
      actualQuantity = availableStock > 0 ? availableStock : 0;
      pendingQuantity = quantity - actualQuantity;
      hasPending = pendingQuantity > 0;

      if (hasPending) {
        toast.warning(
          `Estoque insuficiente! Adicionado ${actualQuantity} unidades. ${pendingQuantity} ficaram como pendência.`,
          { duration: 4000 }
        );
      }
    }

    const {
      unitPriceWithDiscount,
      discountAmount,
      discountPercentage,
      commissionPercentage,
    } = calculateTotals();

    // 🔥 AJUSTE: Recalcular totais baseado na quantidade efetiva (não pendente)
    const discountAmountPerUnit =
      (selectedProduct.price * discountPercentage) / 100;
    const effectiveFinalPrice = actualQuantity * unitPriceWithDiscount;
    const effectiveDiscountAmount = actualQuantity * discountAmountPerUnit;

    const processedDiscountId =
      selectedDiscountId &&
      selectedDiscountId.trim() &&
      selectedDiscountId !== "none"
        ? selectedDiscountId
        : undefined;

    const newItem: OrderItem = {
      id: Math.random().toString(36).substr(2, 9),
      product_id: selectedProduct.id, // UUID como string, não converter para número
      product_code: selectedProduct.product,
      product_name: selectedProduct.product,
      product_group_name: selectedProduct.groupName || undefined,
      quantity: actualQuantity, // Quantidade efetiva (disponível)
      unit_price: unitPriceWithDiscount,
      original_unit_price: selectedProduct.price,
      discount_id: processedDiscountId,
      discount_percentage: discountPercentage,
      discount_amount: effectiveDiscountAmount, // Desconto baseado na qtd efetiva
      total_price: effectiveFinalPrice, // Total baseado na qtd efetiva
      commission_percentage: commissionPercentage,
      client_ref: clientRef,
      pending_quantity: pendingQuantity, // 🔥 NOVO: Quantidade pendente
      has_pending: hasPending, // 🔥 NOVO: Flag de pendência
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    onAdd(newItem);

    if (hasPending) {
      toast.success(
        `Produto adicionado! ${actualQuantity} unidades confirmadas, ${pendingQuantity} pendentes.`
      );
    } else {
      toast.success("Produto adicionado ao pedido!");
    }

    onClose();
  };

  const handleBack = () => {
    setStep("search");
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price);
  };

  const {
    unitPriceWithDiscount,
    itemTotal,
    discountAmount,
    finalPrice,
    discountPercentage,
  } = calculateTotals();

  // Handler para teclas no formulário de detalhes
  const handleDetailsKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      handleBack();
    }
    // Ctrl+Enter ou Cmd+Enter para confirmar
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleConfirm();
    }
  };

  return (
    <>
      {/* Modal de Busca */}
      <ProductSearchModal
        isOpen={isOpen && step === "search"}
        onClose={onClose}
        onSelect={handleProductSelect}
      />

      {/* Modal de Detalhes do Produto */}
      <Dialog
        open={isOpen && step === "details"}
        onOpenChange={(open) => !open && onClose()}
      >
        <DialogContent className="max-w-lg mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Detalhes do Produto
            </DialogTitle>
            <DialogDescription>
              Configure os detalhes do produto para adicionar ao pedido
            </DialogDescription>
          </DialogHeader>

          {selectedProduct && (
            <div className="space-y-4">
              {/* Produto Selecionado */}
              <Card className="border-green-200 bg-green-50">
                <CardContent className="p-3">
                  <div className="space-y-1">
                    <div className="font-medium text-green-900 text-sm">
                      {selectedProduct.product}
                    </div>
                    {selectedProduct.groupName && (
                      <div className="text-xs text-green-700">
                        {selectedProduct.groupName}
                      </div>
                    )}
                    {selectedProduct.application && (
                      <div className="text-xs text-green-700 line-clamp-2">
                        {selectedProduct.application}
                      </div>
                    )}
                    <div className="flex justify-between text-xs text-green-700 mt-2">
                      <span>
                        Estoque: <strong>{selectedProduct.stock}</strong>
                      </span>
                      <span>
                        Preço:{" "}
                        <strong>{formatPrice(selectedProduct.price)}</strong>
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Formulário */}
              <div className="space-y-3">
                {/* Referência do Cliente */}
                <div className="space-y-1">
                  <Label
                    htmlFor="client_ref"
                    className="flex items-center gap-1 text-xs"
                  >
                    <Hash className="h-3 w-3" />
                    Referência do Cliente
                  </Label>
                  <Input
                    ref={clientRefInputRef}
                    id="client_ref"
                    type="text"
                    value={clientRef}
                    onChange={(e) => setClientRef(e.target.value.toUpperCase())}
                    onKeyDown={handleDetailsKeyDown}
                    placeholder="OPCIONAL"
                    className="uppercase h-9 text-sm"
                  />
                </div>

                {/* Quantidade */}
                <div className="space-y-1">
                  <Label
                    htmlFor="quantity"
                    className="flex items-center gap-1 text-xs"
                  >
                    <Calculator className="h-3 w-3" />
                    Quantidade *
                  </Label>
                  <Input
                    ref={quantityInputRef}
                    id="quantity"
                    type="number"
                    value={quantity}
                    onChange={(e) =>
                      setQuantity(parseFloat(e.target.value) || 1)
                    }
                    onKeyDown={handleDetailsKeyDown}
                    min="1"
                    step="1"
                    className="font-mono h-9 text-sm"
                  />
                  {selectedProduct &&
                    quantity > Number(selectedProduct.stock) && (
                      <div className="text-xs text-orange-600 font-medium">
                        ⚠️ Quantidade maior que estoque
                      </div>
                    )}
                </div>

                {/* Desconto */}
                <div className="space-y-1">
                  <Label className="flex items-center gap-1 text-xs">
                    <Percent className="h-3 w-3" />
                    Desconto
                  </Label>
                  <Select
                    value={selectedDiscountId}
                    onValueChange={setSelectedDiscountId}
                  >
                    <SelectTrigger
                      onKeyDown={handleDetailsKeyDown}
                      className="w-full h-9 text-sm"
                    >
                      <SelectValue placeholder="Selecione um desconto" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[40vh] overflow-y-auto">
                      <SelectItem value="none">
                        <div className="flex flex-col">
                          <span className="font-medium text-xs">
                            Sem desconto
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Preço normal do produto
                          </span>
                        </div>
                      </SelectItem>
                      {discounts.map((discount: Discount) => (
                        <SelectItem key={discount.id} value={discount.id}>
                          <div className="flex flex-col">
                            <span className="font-medium text-xs">
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
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Resumo de Valores */}
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="p-3">
                  <div className="space-y-1.5 text-xs">
                    <div className="font-medium text-blue-900 text-sm mb-1">
                      Resumo do Item
                    </div>

                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {quantity} x {formatPrice(selectedProduct.price)}
                      </span>
                      <span className="font-mono font-medium">
                        {formatPrice(itemTotal)}
                      </span>
                    </div>

                    {discountPercentage > 0 && (
                      <div className="flex justify-between text-red-600">
                        <span>
                          Desconto ({discountPercentage.toFixed(2)}%):
                        </span>
                        <span className="font-mono">
                          - {formatPrice(discountAmount)}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between font-bold text-blue-900 pt-1.5 border-t border-blue-300">
                      <span>Total:</span>
                      <span className="font-mono text-base">
                        {formatPrice(finalPrice)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Botões */}
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleConfirm}
                  className="flex-1 h-10"
                  variant="default"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Adicionar
                </Button>
                <Button
                  variant="outline"
                  onClick={handleBack}
                  className="w-24 h-10"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
