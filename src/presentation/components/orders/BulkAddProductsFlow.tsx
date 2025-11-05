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
import { Textarea } from "@/components/ui/textarea";
import { useIsMobile } from "@/presentation/hooks/use-mobile";
import { useProductAutocomplete } from "@/presentation/hooks/useProductAutocomplete";
import type { Discount, OrderItem } from "@/presentation/types/order.types";
import { supabase } from "@/shared/infrastructure/database/supabase-wrapper";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle,
  Copy,
  Loader2,
  Package,
  Plus,
  ShoppingCart,
  XCircle,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ProductSuggestions } from "./ProductSuggestions";

interface BulkAddProductsFlowProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (items?: OrderItem[]) => void;
  orderId?: string; // Opcional para novos pedidos
}

interface BulkAddItem {
  code: string;
  quantity: number;
}

interface ValidationError {
  lineIndex: number;
  lineNumber: number;
  message: string;
  line: string;
}

interface BulkSearchResult {
  code: string;
  name: string;
  application?: string;
  stock: number;
  quantity: number;
  originalPrice: number;
  priceWithDiscount: number;
  totalPrice: number;
  discountAmount: number;
  pendingQuantity?: number; // 🔥 NOVO: Quantidade pendente
  hasPending?: boolean; // 🔥 NOVO: Flag de pendência
}

interface BulkSearchResponse {
  success: boolean;
  statistics: {
    total: number;
    found: number;
    notFound: number;
    inserted: number;
  };
  results: {
    found: BulkSearchResult[];
    notFound: string[];
  };
  discountApplied?: {
    id: string;
    name: string;
    percentage: number;
  };
}

export function BulkAddProductsFlow({
  isOpen,
  onClose,
  onSuccess,
  orderId,
}: BulkAddProductsFlowProps) {
  // Hook para detectar mobile
  const isMobile = useIsMobile();

  const [codes, setCodes] = useState("");
  const [selectedDiscountId, setSelectedDiscountId] = useState<string>("none");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<BulkSearchResponse | null>(null);

  // Estados para validação em tempo real
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>(
    []
  );
  const [productCount, setProductCount] = useState(0);

  // Estados para validação prévia
  const [isValidating, setIsValidating] = useState(false);

  // 🔥 NOVO ESTADO: Controla quando mostrar o feedback de erro ao clicar no botão
  const [showValidationFeedback, setShowValidationFeedback] = useState(false);

  // Estados para autocomplete
  const [cursorPosition, setCursorPosition] = useState(0);
  const [autocompletePosition, setAutocompletePosition] = useState({
    top: 0,
    left: 0,
    width: 300,
  });
  const [currentLineText, setCurrentLineText] = useState("");

  // Refs
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Hook de autocomplete
  const {
    suggestions,
    isLoading: autocompleteLoading,
    showSuggestions,
    selectedIndex,
    searchProduct,
    selectSuggestion,
    clearSuggestions,
    navigateUp,
    navigateDown,
    selectCurrent,
  } = useProductAutocomplete({
    debounceMs: 300,
    maxSuggestions: 5,
    minQueryLength: 4,
  });

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

  // Reset ao abrir modal - SIMPLIFICADO
  useEffect(() => {
    if (isOpen) {
      setCodes("");
      setSelectedDiscountId("none");
      setResults(null);
      setValidationErrors([]);
      setProductCount(0);
      setShowValidationFeedback(false);
      setIsValidating(false);
      clearSuggestions();
    }
  }, [isOpen, clearSuggestions]);

  // 🔥 FUNÇÃO SIMPLIFICADA: Validar uma linha individual
  const validateLine = (line: string, index: number) => {
    const trimmedLine = line.trim();

    if (trimmedLine.length === 0) {
      return { isValid: true }; // Linha vazia é válida
    }

    // Usar a mesma regex do parseInput
    const match = trimmedLine.match(/^(.*?)[\s,-.]+(\d+)$/);

    if (match) {
      const code = match[1].trim();
      const quantityStr = match[2];
      const quantity = parseInt(quantityStr, 10);

      if (!code) {
        return {
          isValid: false,
          error: "Código do produto não pode estar vazio",
        };
      }

      if (isNaN(quantity) || quantity <= 0) {
        return {
          isValid: false,
          error: "Quantidade deve ser um número positivo",
        };
      }

      return { isValid: true };
    } else {
      // Se não tem separador, verifica se é só um código válido
      const cleanedCode = trimmedLine.replace(/[^a-zA-Z0-9/-]/g, "");
      if (!cleanedCode) {
        return {
          isValid: false,
          error: "Formato inválido - use CODIGO,QUANTIDADE ou apenas CODIGO",
        };
      }
      return { isValid: true }; // Código sem quantidade é válido (quantidade = 1)
    }
  };

  // 🔥 FUNÇÃO SIMPLIFICADA: Validar todo o texto - APENAS FORMATO
  const validateAllLines = (text: string) => {
    const lines = text.split("\n");
    const errors: ValidationError[] = [];
    let count = 0;

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();

      if (trimmedLine.length > 0) {
        count++;

        // Verificar se excedeu o limite
        if (count > 50) {
          errors.push({
            lineIndex: index,
            lineNumber: index + 1,
            message: "Máximo de 50 produtos permitido",
            line: trimmedLine,
          });
          return;
        }

        // Validação APENAS de formato
        const validation = validateLine(trimmedLine, index);
        if (!validation.isValid) {
          errors.push({
            lineIndex: index,
            lineNumber: index + 1,
            message: validation.error || "Formato inválido",
            line: trimmedLine,
          });
        }
      }
    });

    setValidationErrors(errors);
    setProductCount(count);
  };

  // Função para obter a cor do contador
  const getCounterColor = (count: number) => {
    if (count <= 40) return "text-green-600";
    if (count <= 45) return "text-yellow-600";
    return "text-red-600";
  };

  // 🔥 NOVA FUNÇÃO: Validação prévia completa no banco de dados
  const validateAllProductsInDatabase = async (inputText: string) => {
    try {
      // Processar texto em linhas e extrair códigos únicos
      const lines = inputText.split("\n");
      const codes = new Set<string>();

      // Mapear linhas para códigos
      const lineCodeMap: { [lineIndex: number]: string } = {};

      lines.forEach((line, index) => {
        const trimmedLine = line.trim();

        if (trimmedLine.length > 0) {
          // Extrair código da linha
          const match = trimmedLine.match(/^(.*?)[\s,-.]+(\d+)$/);
          const code = match
            ? match[1].trim().toUpperCase()
            : trimmedLine.toUpperCase();

          codes.add(code);
          lineCodeMap[index] = code;
        }
      });

      // Buscar produtos no banco
      const { data: products, error: productsError } = await supabase
        .from("products")
        .select("product")
        .in("product", Array.from(codes));

      if (productsError) {
        throw new Error(
          "Erro ao verificar produtos no banco: " + productsError.message
        );
      }

      // Criar set dos produtos encontrados para lookup rápido
      const foundProducts = new Set(
        (products || []).map((p) => p.product.toUpperCase())
      );

      // Mapear erros para linhas específicas
      const newErrors: ValidationError[] = [];

      lines.forEach((line, index) => {
        const trimmedLine = line.trim();

        if (trimmedLine.length > 0) {
          const code = lineCodeMap[index];

          // Verificar se produto existe no banco
          if (!foundProducts.has(code)) {
            newErrors.push({
              lineIndex: index,
              lineNumber: index + 1,
              message: "Produto não encontrado no sistema",
              line: trimmedLine,
            });
          }
        }
      });

      return {
        success: newErrors.length === 0,
        errors: newErrors,
        foundProducts: Array.from(foundProducts),
      };
    } catch (error) {
      console.error("Erro na validação prévia:", error);
      throw error;
    }
  };

  // 🔥 FUNÇÃO SIMPLIFICADA - Posiciona a caixa de sugestões ACIMA do textarea
  const calculateAutocompletePosition = (textarea: HTMLTextAreaElement) => {
    const rect = textarea.getBoundingClientRect();

    return {
      top: rect.top - 200, // 200px acima do textarea
      left: rect.left, // Mesma posição horizontal do textarea
      width: Math.min(rect.width, 300), // Mesma largura do textarea (máximo 300px)
    };
  };

  // 🔥 FUNÇÃO SIMPLIFICADA: Processar códigos inseridos
  const parseInput = (input: string): BulkAddItem[] => {
    if (!input.trim()) return [];

    const normalizedItems: BulkAddItem[] = [];
    const lines = input
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    lines.forEach((line, index) => {
      let code: string;
      let quantity: number;

      const match = line.match(/^(.*?)[\s,-.]+(\d+)$/);

      if (match) {
        code = match[1].trim();
        quantity = parseInt(match[2], 10);
      } else {
        code = line;
        quantity = 1;
      }

      if (isNaN(quantity) || quantity <= 0) {
        throw new Error(
          `Quantidade inválida na linha ${
            index + 1
          }: "${line}". Deve ser um número positivo.`
        );
      }

      const cleanedCode = code.replace(/[^a-zA-Z0-9/-]/g, "").toUpperCase();

      if (!cleanedCode) {
        throw new Error(`Código inválido na linha ${index + 1}: "${line}"`);
      }

      normalizedItems.push({ code: cleanedCode, quantity });
    });

    return normalizedItems;
  };

  // 🔥 HANDLER SIMPLIFICADO para mudanças no textarea
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart || 0;

    // Verificar limite de 50 produtos
    const allLines = newValue
      .split("\n")
      .filter((line) => line.trim().length > 0);
    if (allLines.length > 50) {
      toast.warning("Máximo de 50 produtos permitido");
      return;
    }

    // Atualizar estado principal
    setCodes(newValue.toUpperCase());
    setCursorPosition(cursorPos);

    // Esconder feedback quando usuário começar a digitar
    if (showValidationFeedback) {
      setShowValidationFeedback(false);
    }

    // Validação em tempo real
    validateAllLines(newValue);

    // Autocomplete: verificar linha atual
    const textBeforeCursor = newValue.substring(0, cursorPos);
    const linesBeforeCursor = textBeforeCursor.split("\n");
    const currentLine = linesBeforeCursor[linesBeforeCursor.length - 1] || "";
    setCurrentLineText(currentLine);

    // Extrair código para autocomplete
    const codeMatch = currentLine.match(/^([a-zA-Z0-9/-]*)[\\s,-.]/);
    const codeToSearch = codeMatch ? codeMatch[1] : currentLine.trim();

    if (codeToSearch.length >= 4) {
      // Calcular posição do autocomplete
      if (textareaRef.current) {
        setTimeout(() => {
          if (textareaRef.current) {
            const position = calculateAutocompletePosition(textareaRef.current);
            setAutocompletePosition(position);
          }
        }, 0);
      }
      searchProduct(codeToSearch);
    } else {
      clearSuggestions();
    }
  };

  // Handler para teclas especiais
  const handleTextareaKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>
  ) => {
    if (showSuggestions) {
      switch (e.key) {
        case "Escape":
          e.preventDefault();
          clearSuggestions();
          break;
        case "Tab":
          clearSuggestions();
          break;
      }
    }
  };

  // 🔥 NOVA FUNÇÃO: Verificação completa antes de processar
  const handleSearch = async () => {
    if (!codes.trim()) {
      toast.error("Digite pelo menos um produto");
      return;
    }

    // Se há erros de validação de formato, mostrar feedback e parar
    if (validationErrors.length > 0) {
      setShowValidationFeedback(true);
      toast.error(
        `Corrija os ${validationErrors.length} erro${
          validationErrors.length !== 1 ? "s" : ""
        } antes de continuar`
      );
      return;
    }

    try {
      setIsValidating(true);
      setShowValidationFeedback(false);

      // Etapa 1: Validar formato (parseInput)
      let items: BulkAddItem[];
      try {
        items = parseInput(codes);
      } catch (parseError) {
        toast.error(
          parseError instanceof Error
            ? parseError.message
            : "Erro ao processar produtos"
        );
        setShowValidationFeedback(true);
        return;
      }

      if (items.length === 0) {
        toast.error("Nenhum produto válido encontrado");
        return;
      }

      if (items.length > 50) {
        toast.error("Máximo de 50 produtos por vez");
        return;
      }

      // Etapa 2: Validar existência no banco de dados
      const databaseValidation = await validateAllProductsInDatabase(codes);

      if (!databaseValidation.success) {
        // Mesclar erros de formato com erros de banco
        const allErrors = [...validationErrors, ...databaseValidation.errors];
        setValidationErrors(allErrors);
        setShowValidationFeedback(true);

        const productErrors = databaseValidation.errors.length;
        toast.error(
          `${productErrors} produto${
            productErrors !== 1 ? "s" : ""
          } não encontrado${productErrors !== 1 ? "s" : ""} no sistema`
        );
        return;
      }

      // Etapa 3: Tudo validado - processar produtos
      setIsLoading(true);
      await handleBulkAddUnified(items);
    } catch (error) {
      console.error("Erro na validação/busca em lote:", error);
      toast.error(
        error instanceof Error ? error.message : "Erro ao processar produtos"
      );
      setShowValidationFeedback(true);
    } finally {
      setIsValidating(false);
      setIsLoading(false);
    }
  };

  // Função principal de processamento
  const handleBulkAddUnified = async (items: BulkAddItem[]) => {
    try {
      const codes = [
        ...new Set(items.map((item) => item.code.toUpperCase().trim())),
      ];

      // Buscar produtos com IDs e preços base
      const { data: products, error: productsError } = await supabase
        .from("products")
        .select("id, product, price, stock, application")
        .in("product", codes);

      if (productsError) {
        throw new Error("Erro ao buscar produtos: " + productsError.message);
      }

      // Buscar dados do desconto se selecionado
      let discountData = null;
      if (selectedDiscountId && selectedDiscountId !== "none") {
        const { data: discount, error: discountError } = await supabase
          .from("discounts")
          .select("id, name, discount_percentage, commission_percentage")
          .eq("id", selectedDiscountId)
          .eq("active", true)
          .single();

        if (discountError) {
          console.warn("❌ Desconto não encontrado:", discountError);
        } else {
          discountData = discount;
        }
      }

      // Processar resultados MANTENDO A ORDEM ORIGINAL
      const found: BulkSearchResult[] = [];
      const notFound: string[] = [];
      const orderItems: OrderItem[] = [];

      // Criar mapa de produtos para lookup eficiente
      const productsMap = new Map();
      products?.forEach((product) => {
        productsMap.set(product.product.toUpperCase(), product);
      });

      // Processar itens NA ORDEM ORIGINAL
      for (let index = 0; index < items.length; index++) {
        const item = items[index];
        const product = productsMap.get(item.code.toUpperCase());

        if (product) {
          // 🔥 NOVA LÓGICA: Calcular pendências baseado no estoque
          const availableStock = Number(product.stock);
          const requestedQuantity = item.quantity;
          let actualQuantity = requestedQuantity;
          let pendingQuantity = 0;
          let hasPending = false;

          if (requestedQuantity > availableStock) {
            // Se quantidade solicitada é maior que o estoque
            actualQuantity = availableStock > 0 ? availableStock : 0;
            pendingQuantity = requestedQuantity - actualQuantity;
            hasPending = pendingQuantity > 0;
          }

          // Calcular preços baseado na quantidade efetiva
          const originalPrice = Number(product.price);
          const discountPercentage = discountData
            ? Number(discountData.discount_percentage || 0)
            : 0;
          const commissionPercentage = discountData
            ? Number(discountData.commission_percentage || 0)
            : 0;

          const discountAmountPerUnit =
            (originalPrice * discountPercentage) / 100;
          const priceWithDiscount = originalPrice - discountAmountPerUnit;
          const totalPrice = actualQuantity * priceWithDiscount; // 🔥 Baseado na qtd efetiva
          const totalDiscountAmount = actualQuantity * discountAmountPerUnit; // 🔥 Baseado na qtd efetiva

          // Para exibição na tabela
          found.push({
            code: product.product,
            name: product.product,
            application: product.application,
            stock: product.stock,
            quantity: actualQuantity, // 🔥 Quantidade efetiva
            originalPrice: originalPrice,
            priceWithDiscount: priceWithDiscount,
            totalPrice: totalPrice,
            discountAmount: totalDiscountAmount,
            pendingQuantity: pendingQuantity, // 🔥 NOVO: Quantidade pendente
            hasPending: hasPending, // 🔥 NOVO: Flag de pendência
          });

          // Para adicionar ao pedido (apenas se for novo pedido)
          if (!orderId) {
            const orderItem: OrderItem = {
              id: Math.random().toString(36).substr(2, 9),
              product_id: product.id,
              product_code: product.product,
              product_name: product.product,
              quantity: actualQuantity, // 🔥 Quantidade efetiva
              unit_price: priceWithDiscount,
              original_unit_price: originalPrice,
              discount_id: discountData?.id || undefined,
              discount_percentage: discountPercentage,
              discount_amount: totalDiscountAmount,
              total_price: totalPrice,
              commission_percentage: commissionPercentage,
              client_ref: undefined,
              pending_quantity: pendingQuantity, // 🔥 NOVO: Quantidade pendente
              has_pending: hasPending, // 🔥 NOVO: Flag de pendência
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            orderItems.push(orderItem);
          }
        } else {
          notFound.push(item.code.toUpperCase());
        }
      }

      // Para pedidos existentes, inserir no banco
      if (orderId && found.length > 0) {
        const timestamp = Date.now();
        const orderItemsToInsert = found.map((item, index) => {
          const product = productsMap.get(item.code.toUpperCase());
          const originalItem = items.find(
            (i) => i.code.toUpperCase() === item.code.toUpperCase()
          );

          const clientRef = `BULK_ADD_${timestamp}_${index
            .toString()
            .padStart(3, "0")}`;

          const insertData = {
            order_id: orderId,
            product_id: product.id,
            quantity: item.quantity, // 🔥 Quantidade efetiva (não pendente)
            unit_price: item.priceWithDiscount,
            original_unit_price: item.originalPrice,
            discount_id: discountData?.id || null,
            discount_percentage: discountData
              ? Number(discountData.discount_percentage || 0)
              : 0,
            discount_amount: item.discountAmount,
            total_price: item.totalPrice,
            commission_percentage: discountData
              ? Number(discountData.commission_percentage || 0)
              : 0,
            client_ref: clientRef,
            pending_quantity: item.pendingQuantity || 0, // 🔥 NOVO: Quantidade pendente
            has_pending: item.hasPending || false, // 🔥 NOVO: Flag de pendência
          };

          return insertData;
        });

        // Inserção sequencial para garantir ordem correta
        let insertError: any = null;
        for (let i = 0; i < orderItemsToInsert.length; i++) {
          const item = orderItemsToInsert[i];

          const { error } = await supabase.from("order_items").insert(item);

          if (error) {
            insertError = error;
            break;
          }

          // Pequeno delay para garantir timestamps diferentes
          if (i < orderItemsToInsert.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 10));
          }
        }

        if (insertError) {
          throw new Error(
            "Erro ao adicionar itens ao pedido: " + insertError.message
          );
        }
      }

      // Preparar resposta
      const response: BulkSearchResponse = {
        success: true,
        statistics: {
          total: items.length,
          found: found.length,
          notFound: notFound.length,
          inserted: found.length,
        },
        results: {
          found,
          notFound,
        },
        discountApplied: discountData
          ? {
              id: discountData.id,
              name: discountData.name,
              percentage: Number(discountData.discount_percentage),
            }
          : undefined,
      };

      setResults(response);

      // Feedback e callback
      if (found.length > 0) {
        // 🔥 NOVA LÓGICA: Contar pendências para feedback
        const itemsWithPending = found.filter((item) => item.hasPending);
        const totalPendingItems = itemsWithPending.length;

        let message = orderId
          ? `${found.length} produto(s) adicionado(s) ao pedido!`
          : `${found.length} produto(s) preparado(s) para adicionar!`;

        if (totalPendingItems > 0) {
          message += ` ${totalPendingItems} item(ns) com pendência por falta de estoque.`;
          toast.warning(message, { duration: 5000 });
        } else {
          toast.success(message);
        }

        // Para pedidos novos, passar os OrderItems
        onSuccess(orderId ? undefined : orderItems);
      }

      if (notFound.length > 0) {
        toast.warning(`${notFound.length} produto(s) não encontrado(s)`);
      }
    } catch (error) {
      console.error("Erro ao processar produtos:", error);
      throw error;
    }
  };

  const handleCopyResults = () => {
    if (!results) return;

    const text = results.results.found
      .map(
        (item) =>
          `${item.code} | ${item.quantity}x | ${formatPrice(
            item.priceWithDiscount
          )} | ${formatPrice(item.totalPrice)}`
      )
      .join("\n");

    navigator.clipboard.writeText(text).then(() => {
      toast.success("Resultados copiados!");
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price);
  };

  const handleClose = () => {
    setResults(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        className={`
        ${
          isMobile
            ? "w-[95vw] max-w-[95vw] h-[95vh] max-h-[95vh] m-2"
            : "max-w-4xl max-h-[90vh]"
        }
        overflow-y-auto
      `}
      >
        <DialogHeader className={isMobile ? "pb-2" : ""}>
          <DialogTitle
            className={`flex items-center gap-2 ${isMobile ? "text-lg" : ""}`}
          >
            <ShoppingCart className="h-5 w-5" />
            {orderId
              ? "Adicionar Produtos em Lote ao Pedido"
              : "Adicionar Produtos em Lote"}
          </DialogTitle>
          <DialogDescription className="text-sm">
            Cole os códigos dos produtos com suas quantidades (formato:
            CODIGO,QUANTIDADE - um por linha)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Formulário */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="codes">
                Códigos dos Produtos (CODIGO,QUANTIDADE)
              </Label>
              <div className="relative">
                <Textarea
                  ref={textareaRef}
                  id="codes"
                  placeholder="Exemplo:&#10;WOE451,2&#10;WAP181 - 1&#10;WAP184 3&#10;PROD-X.5"
                  value={codes}
                  onChange={handleTextareaChange}
                  onKeyDown={handleTextareaKeyDown}
                  className={`
                    min-h-[120px] font-mono text-sm resize-y
                    ${
                      validationErrors.length > 0
                        ? "border-red-300 focus-visible:ring-red-500"
                        : ""
                    }
                  `}
                  disabled={isLoading}
                />

                {/* Autocomplete Suggestions - APENAS VISUAL */}
                <ProductSuggestions
                  suggestions={suggestions}
                  isLoading={autocompleteLoading}
                  showSuggestions={showSuggestions}
                  selectedIndex={-1}
                  onSelect={() => {}} // Função vazia - não faz nada
                  onClose={clearSuggestions}
                  position={autocompletePosition}
                />
              </div>

              {/* Contador de Produtos */}
              <div className="flex items-center justify-between text-xs">
                <div className="text-muted-foreground">
                  • Digite 4+ caracteres para ver sugestões • Continue digitando
                  normalmente
                </div>
                <div className={`font-medium ${getCounterColor(productCount)}`}>
                  {productCount} de 50 produtos
                  {productCount >= 50 && (
                    <span className="ml-2 text-red-600">
                      ⚠️ Limite atingido
                    </span>
                  )}
                </div>
              </div>

              {/* Erros de Validação */}
              {validationErrors.length > 0 && (
                <Alert variant="destructive" className="mt-2">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-medium mb-2">
                      {validationErrors.length} erro
                      {validationErrors.length !== 1 ? "s" : ""} encontrado
                      {validationErrors.length !== 1 ? "s" : ""}:
                    </div>
                    <ul className="space-y-1 text-sm">
                      {validationErrors.slice(0, 5).map((error, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-red-600 font-mono">
                            Linha {error.lineNumber}:
                          </span>
                          <span>{error.message}</span>
                        </li>
                      ))}
                      {validationErrors.length > 5 && (
                        <li className="text-red-600 font-medium">
                          + {validationErrors.length - 5} erro
                          {validationErrors.length - 5 !== 1 ? "s" : ""}{" "}
                          adiciona
                          {validationErrors.length - 5 !== 1 ? "is" : "l"}
                        </li>
                      )}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              <div className="text-xs text-muted-foreground">
                • Máximo de 50 produtos por vez
                <br />
                • Formato: CODIGO,QUANTIDADE (ex: WOE451,2)
                <br />
                • Aceita formatos: "CODIGO - QUANTIDADE", "CODIGO QUANTIDADE",
                "CODIGO.QUANTIDADE"
                <br />• Um produto por linha • Sem quantidade = 1 unidade
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="discount" className="text-sm font-medium">
                Desconto (Opcional)
              </Label>
              <Select
                value={selectedDiscountId}
                onValueChange={setSelectedDiscountId}
                disabled={isLoading}
              >
                <SelectTrigger className={isMobile ? "h-12 text-sm" : ""}>
                  <SelectValue placeholder="Selecione um desconto" />
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
                    <SelectItem
                      value="none"
                      className={isMobile ? "py-3 px-3" : ""}
                    >
                      <div className="flex flex-col gap-1 w-full">
                        <span className="font-medium text-sm">
                          Sem desconto
                        </span>
                        <span className="text-xs text-gray-600">
                          Preço original dos produtos
                        </span>
                      </div>
                    </SelectItem>
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

            {/* Botão com novo fluxo de validação */}
            <Button
              onClick={handleSearch}
              disabled={isLoading || isValidating || !codes.trim()}
              className={`w-full ${isMobile ? "h-12" : ""}`}
            >
              {isValidating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Verificando produtos...
                </>
              ) : isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adicionando ao pedido...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  {orderId ? "Adicionar ao Pedido" : "Adicionar Produtos"}
                </>
              )}
            </Button>

            {/* Feedback visual de erro após o botão - MELHORADO */}
            {validationErrors.length > 0 && showValidationFeedback && (
              <Alert
                variant="destructive"
                className="mt-4 animate-in slide-in-from-top-2 duration-300"
              >
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium mb-3 text-red-800">
                    ❌ Corrija os seguintes erros antes de adicionar os
                    produtos:
                  </div>
                  <div className="space-y-2">
                    {validationErrors.slice(0, 8).map((error, index) => {
                      const isProductNotFound = error.message.includes(
                        "não encontrado no sistema"
                      );
                      return (
                        <div
                          key={index}
                          className="bg-red-50 border border-red-200 rounded-md p-2"
                        >
                          <div className="flex items-start gap-2">
                            <Badge
                              variant="destructive"
                              className="text-xs font-mono"
                            >
                              Linha {error.lineNumber}
                            </Badge>
                            <div className="flex-1">
                              <div className="text-sm font-medium text-red-800 flex items-center gap-1">
                                {isProductNotFound && (
                                  <Package className="h-3 w-3" />
                                )}
                                {error.message}
                              </div>
                              <div className="text-xs text-red-600 font-mono mt-1 bg-red-100 px-2 py-1 rounded">
                                "{error.line}"
                              </div>
                              {isProductNotFound && (
                                <div className="text-xs text-orange-600 mt-1">
                                  🔍 Verifique se o código está correto ou se o
                                  produto existe no sistema
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {validationErrors.length > 8 && (
                      <div className="text-center text-sm text-red-600 font-medium">
                        + {validationErrors.length - 8} erro
                        {validationErrors.length - 8 !== 1 ? "s" : ""} adiciona
                        {validationErrors.length - 8 !== 1 ? "is" : "l"}
                      </div>
                    )}
                  </div>
                  <div className="mt-3 text-xs text-red-600">
                    💡 Dica: Corrija os erros acima e tente novamente. O
                    feedback desaparecerá automaticamente quando você começar a
                    editar.
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Resultados */}
          {results && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Resultados
                  </CardTitle>
                  {results.results.found.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyResults}
                      className="flex items-center gap-2"
                    >
                      <Copy className="h-4 w-4" />
                      Copiar
                    </Button>
                  )}
                </div>

                {/* Estatísticas */}
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">
                    Total: {results.statistics.total}
                  </Badge>
                  <Badge
                    variant="default"
                    className="bg-green-100 text-green-800"
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Adicionados: {results.statistics.inserted}
                  </Badge>
                  {results.statistics.notFound > 0 && (
                    <Badge variant="destructive">
                      <XCircle className="h-3 w-3 mr-1" />
                      Não encontrados: {results.statistics.notFound}
                    </Badge>
                  )}
                </div>

                {results.discountApplied && (
                  <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded">
                    ✅ Desconto aplicado: {results.discountApplied.name} (
                    {results.discountApplied.percentage}%)
                  </div>
                )}
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Produtos Encontrados */}
                {results.results.found.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3 text-green-700 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Produtos Adicionados ({results.results.found.length})
                    </h4>
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Código</TableHead>
                            <TableHead>Qtd</TableHead>
                            <TableHead>Pend.</TableHead>
                            <TableHead>Estoque</TableHead>
                            <TableHead>Preço Unit.</TableHead>
                            <TableHead>Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {results.results.found.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell>
                                <div>
                                  <div className="font-medium">{item.code}</div>
                                  {item.application && (
                                    <div className="text-xs text-muted-foreground">
                                      {item.application}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {item.quantity}x
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {item.hasPending ? (
                                  <Badge
                                    variant="destructive"
                                    className="text-xs"
                                  >
                                    {item.pendingQuantity}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground text-xs">
                                    -
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    item.stock > 0 ? "secondary" : "destructive"
                                  }
                                  className="text-xs"
                                >
                                  {item.stock}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="text-right">
                                  <div className="font-medium">
                                    {formatPrice(item.priceWithDiscount)}
                                  </div>
                                  {item.discountAmount > 0 && (
                                    <div className="text-xs text-green-600">
                                      -
                                      {formatPrice(
                                        item.discountAmount / item.quantity
                                      )}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="text-right font-medium">
                                  {formatPrice(item.totalPrice)}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                {/* Produtos Não Encontrados */}
                {results.results.notFound.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3 text-red-700 flex items-center gap-2">
                      <XCircle className="h-4 w-4" />
                      Produtos Não Encontrados (
                      {results.results.notFound.length})
                    </h4>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <div className="flex flex-wrap gap-1">
                        {results.results.notFound.map((code, index) => (
                          <Badge
                            key={index}
                            variant="destructive"
                            className="text-xs"
                          >
                            {code}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Ações */}
          <div
            className={`flex justify-end gap-3 ${
              isMobile
                ? "pt-4 sticky bottom-0 bg-white border-t border-gray-200 -mx-6 px-6 pb-4"
                : ""
            }`}
          >
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
              className={`${isMobile ? "h-11 flex-1" : ""}`}
            >
              {results?.statistics.inserted ? "Fechar" : "Cancelar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
