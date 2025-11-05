"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import type { Discount, OrderItem } from "@/presentation/types/order.types";
import { useQuery } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import * as React from "react";
import { useEffect, useState } from "react";

interface OrderItemsTableProps {
  items: OrderItem[];
  onItemUpdate: (itemId: string, updates: Partial<OrderItem>) => void;
  onItemRemove: (itemId: string) => void;
}

// ✅ FUNÇÃO PARA ORDENAR ITENS: Ordem cronológica simples baseada em created_at
const sortItems = (items: OrderItem[]) => {
  return [...items].sort((a, b) => {
    // Ordenar por data de criação (mais antigos primeiro = ordem de adição)
    const dateA = new Date(a.created_at).getTime();
    const dateB = new Date(b.created_at).getTime();
    return dateA - dateB;
  });
};

export function OrderItemsTable({
  items,
  onItemUpdate,
  onItemRemove,
}: OrderItemsTableProps) {
  const [isMobile, setIsMobile] = useState(false);
  // ✅ SOLUÇÃO: Estado local para gerenciar a edição do preço unitário
  const [editingUnitPrices, setEditingUnitPrices] = useState<
    Record<string, string>
  >({});

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

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

  // ✅ ORDENAÇÃO CRONOLÓGICA: Itens aparecem na ordem que foram adicionados ao pedido
  const sortedItems = React.useMemo(() => {
    return sortItems(items);
  }, [items]);

  const getDisplayClientRef = (clientRef?: string) => {
    // ✅ OCULTAR códigos internos BULK_ADD_ da visualização do usuário
    if (!clientRef || clientRef.startsWith("BULK_ADD_")) return "";
    return clientRef;
  };

  const handleClientRefChange = (itemId: string, value: string) => {
    onItemUpdate(itemId, { client_ref: value });
  };

  const handleQuantityChange = (itemId: string, value: string) => {
    const quantity = parseFloat(value) || 0;
    onItemUpdate(itemId, { quantity });
  };

  const handleDiscountChange = (itemId: string, discountId: string) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    if (discountId === "none") {
      onItemUpdate(itemId, {
        discount_percentage: 0,
        commission_percentage: 0,
        discount_id: undefined,
        unit_price: item.original_unit_price,
      });
    } else {
      const discount = discounts.find((d: Discount) => d.id === discountId);
      if (discount) {
        const discountPercentage = Number(discount.discount_percentage) || 0;
        const commissionPercentage =
          Number(discount.commission_percentage || 0) || 0;
        const discountAmount =
          (item.original_unit_price * discountPercentage) / 100;
        const newUnitPrice = Number(
          (item.original_unit_price - discountAmount).toFixed(2),
        );

        onItemUpdate(itemId, {
          discount_percentage: isNaN(discountPercentage)
            ? 0
            : discountPercentage,
          commission_percentage: commissionPercentage,
          discount_id: discountId,
          unit_price: newUnitPrice,
        });
      }
    }
  };

  // ✅ SOLUÇÃO: Função que atualiza o estado global quando o campo perde o foco (onBlur)
  const handleUnitPriceBlur = (itemId: string) => {
    const editedValue = editingUnitPrices[itemId];
    // Se não houve edição ou o valor está vazio, não faz nada
    if (editedValue === undefined || editedValue === "") return;

    const unitPrice = Number(
      (parseFloat(editedValue.replace(",", ".")) || 0).toFixed(2),
    );
    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    let discountPercentage = 0;
    if (item.original_unit_price > 0 && unitPrice < item.original_unit_price) {
      discountPercentage = Number(
        (
          ((item.original_unit_price - unitPrice) / item.original_unit_price) *
          100
        ).toFixed(2),
      );
    }

    onItemUpdate(itemId, {
      unit_price: unitPrice,
      discount_percentage: discountPercentage,
      discount_id: item.discount_id,
    });

    // Limpa o estado de edição para este item
    setEditingUnitPrices((prev) => {
      const newState = { ...prev };
      delete newState[itemId];
      return newState;
    });
  };

  // ✅ SOLUÇÃO: Função que captura a digitação no estado local
  const handleUnitPriceLocalChange = (itemId: string, value: string) => {
    setEditingUnitPrices((prev) => ({
      ...prev,
      [itemId]: value,
    }));
  };

  if (sortedItems.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <div className="text-4xl mb-2">📦</div>
        <div className="text-lg font-medium">Nenhum item adicionado</div>
        <div className="text-sm">
          Clique em "Adicionar Produto" para começar
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead
                className={isMobile ? "w-[40px] min-w-[40px]" : "w-[50px]"}
              >
                #
              </TableHead>
              <TableHead
                className={isMobile ? "w-[70px] min-w-[70px]" : "w-[80px]"}
              >
                Pend.
              </TableHead>
              <TableHead className={isMobile ? "min-w-[150px]" : "w-[300px]"}>
                Produto
              </TableHead>
              {!isMobile && (
                <TableHead className="w-[150px]">Ref. Cliente</TableHead>
              )}
              <TableHead
                className={isMobile ? "w-[80px] min-w-[80px]" : "w-[100px]"}
              >
                Qtd
              </TableHead>
              {!isMobile && (
                <TableHead className="w-[120px]">Preço Tabela</TableHead>
              )}
              <TableHead
                className={isMobile ? "w-[100px] min-w-[100px]" : "w-[150px]"}
              >
                Desc. %
              </TableHead>
              <TableHead
                className={isMobile ? "w-[100px] min-w-[100px]" : "w-[120px]"}
              >
                Preço Unit.
              </TableHead>
              <TableHead
                className={isMobile ? "w-[90px] min-w-[90px]" : "w-[120px]"}
              >
                Total
              </TableHead>
              <TableHead className={isMobile ? "w-[50px]" : "w-[60px]"}>
                Ações
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedItems.map((item, index) => (
              <TableRow key={item.id}>
                <TableCell
                  className={isMobile ? "p-2 text-center" : "text-center"}
                >
                  <div
                    className={
                      isMobile
                        ? "font-medium text-sm text-muted-foreground"
                        : "font-medium text-muted-foreground"
                    }
                  >
                    {index + 1}
                  </div>
                </TableCell>

                {/* 🔥 COLUNA PENDÊNCIA - NOVA POSIÇÃO: Entre # e Produto */}
                <TableCell className={isMobile ? "p-2" : ""}>
                  {item.has_pending && item.pending_quantity ? (
                    <div className="text-center">
                      <span className="">{item.pending_quantity}</span>
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground text-xs">
                      -
                    </div>
                  )}
                </TableCell>

                <TableCell className={isMobile ? "p-2" : ""}>
                  <div className="space-y-1">
                    <div
                      className={
                        isMobile ? "font-medium text-sm" : "font-medium"
                      }
                    >
                      {item.product_name}
                    </div>
                    {item.product_group_name && (
                      <div className="text-xs text-gray-500">
                        {item.product_group_name}
                      </div>
                    )}
                    {isMobile && (
                      <div className="text-xs text-gray-500">
                        Tabela:{" "}
                        {new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        }).format(item.original_unit_price)}
                      </div>
                    )}
                    {isMobile && (
                      <Input
                        value={getDisplayClientRef(item.client_ref)}
                        onChange={(e) =>
                          handleClientRefChange(item.id, e.target.value)
                        }
                        placeholder="Ref. do cliente"
                        className="w-full h-7 text-xs mt-1"
                      />
                    )}
                  </div>
                </TableCell>

                {!isMobile && (
                  <TableCell>
                    <Input
                      value={getDisplayClientRef(item.client_ref)}
                      onChange={(e) =>
                        handleClientRefChange(item.id, e.target.value)
                      }
                      placeholder="Ref. do cliente"
                      className="w-full h-8"
                    />
                  </TableCell>
                )}

                <TableCell className={isMobile ? "p-2" : ""}>
                  <Input
                    type="number"
                    value={item.quantity}
                    onChange={(e) =>
                      handleQuantityChange(item.id, e.target.value)
                    }
                    className={isMobile ? "w-full h-8 text-sm" : "w-full h-8"}
                    min="0"
                    step="1"
                  />
                </TableCell>

                {!isMobile && (
                  <TableCell>
                    <div className="font-mono text-sm">
                      {new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(item.original_unit_price)}
                    </div>
                  </TableCell>
                )}

                <TableCell className={isMobile ? "p-2" : ""}>
                  <div>
                    <Select
                      onValueChange={(value) =>
                        handleDiscountChange(item.id, value)
                      }
                      value={item.discount_id || "none"}
                      key={`${item.id}-${item.discount_id}-${discounts.length}`}
                    >
                      <SelectTrigger
                        className={
                          isMobile ? "w-full h-8 text-xs" : "w-full h-8"
                        }
                      >
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sem desconto</SelectItem>
                        {(discounts || []).map((discount: Discount) => (
                          <SelectItem key={discount.id} value={discount.id}>
                            {discount.name} ({discount.discount_percentage}%)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </TableCell>

                {/* ✅ CÉLULA CORRIGIDA */}
                <TableCell className={isMobile ? "p-2" : ""}>
                  <Input
                    type="text" // Mudar para text para permitir digitação de vírgula/ponto
                    inputMode="decimal" // Melhora a experiência em teclados mobile
                    value={
                      // Se estiver editando, usa o valor do estado local. Senão, usa o valor formatado.
                      editingUnitPrices[item.id] !== undefined
                        ? editingUnitPrices[item.id]
                        : Number(item.unit_price).toFixed(2)
                    }
                    onChange={(e) =>
                      handleUnitPriceLocalChange(item.id, e.target.value)
                    }
                    onBlur={() => handleUnitPriceBlur(item.id)}
                    className={isMobile ? "w-full h-8 text-sm" : "w-full h-8"}
                  />
                </TableCell>

                <TableCell className={isMobile ? "p-2" : ""}>
                  <div
                    className={
                      isMobile
                        ? "font-mono font-bold text-xs"
                        : "font-mono font-bold text-sm"
                    }
                  >
                    {new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    }).format(item.quantity * item.unit_price)}
                  </div>
                </TableCell>

                <TableCell className={isMobile ? "p-2" : ""}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onItemRemove(item.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
