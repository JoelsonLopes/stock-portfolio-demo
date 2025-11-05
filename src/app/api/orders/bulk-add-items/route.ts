import { createServerClient } from "@/shared/infrastructure/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

interface BulkAddItem {
  code: string;
  quantity: number;
}

interface BulkAddRequest {
  items: BulkAddItem[];
  discountId?: string;
  orderId: string;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { items, discountId, orderId }: BulkAddRequest = await request.json();

    // Validações básicas
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Lista de produtos é obrigatória" },
        { status: 400 }
      );
    }

    if (!orderId) {
      return NextResponse.json(
        { error: "ID do pedido é obrigatório" },
        { status: 400 }
      );
    }

    if (items.length > 50) {
      return NextResponse.json(
        { error: "Máximo de 50 produtos por vez" },
        { status: 400 }
      );
    }

    // Validar se todos os itens têm código e quantidade válidos
    for (const item of items) {
      if (
        !item.code ||
        typeof item.code !== "string" ||
        item.code.trim() === ""
      ) {
        return NextResponse.json(
          { error: "Código do produto é obrigatório" },
          { status: 400 }
        );
      }
      if (
        !item.quantity ||
        typeof item.quantity !== "number" ||
        item.quantity <= 0
      ) {
        return NextResponse.json(
          { error: "Quantidade deve ser um número positivo" },
          { status: 400 }
        );
      }
    }

    // Verificar se o pedido existe e se o usuário tem acesso
    const { data: orderExists } = await supabase
      .from("orders")
      .select("id")
      .eq("id", orderId)
      .single();

    if (!orderExists) {
      return NextResponse.json(
        { error: "Pedido não encontrado" },
        { status: 404 }
      );
    }

    // Normalizar códigos e remover duplicatas
    const normalizedItems = items.map((item) => ({
      ...item,
      code: item.code.toUpperCase().trim(),
    }));

    // Buscar produtos pelos códigos
    const codes = [...new Set(normalizedItems.map((item) => item.code))];

    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id, product, price, stock, application")
      .in("product", codes);

    if (productsError) {
      console.error("Erro ao buscar produtos:", productsError);
      return NextResponse.json(
        { error: "Erro ao buscar produtos" },
        { status: 500 }
      );
    }

    // Buscar dados do desconto se fornecido
    let discountData = null;
    if (discountId && discountId !== "none") {
      const { data: discount } = await supabase
        .from("discounts")
        .select("id, name, discount_percentage, commission_percentage")
        .eq("id", discountId)
        .eq("is_active", true)
        .single();

      discountData = discount;
    }

    // Processar resultados
    const found: Array<any> = [];
    const notFound: Array<string> = [];

    for (const item of normalizedItems) {
      const product = products?.find((p) => p.product === item.code);

      if (product) {
        // Calcular preços com desconto
        const originalPrice = Number(product.price);
        const discountPercentage = discountData
          ? Number(discountData.discount_percentage)
          : 0;
        const commissionPercentage = discountData
          ? Number(discountData.commission_percentage || 0)
          : 0;

        const discountAmount = (originalPrice * discountPercentage) / 100;
        const priceWithDiscount = originalPrice - discountAmount;
        const totalPrice = item.quantity * priceWithDiscount;
        const totalDiscountAmount = item.quantity * discountAmount;
        const commissionAmount = (totalPrice * commissionPercentage) / 100;

        found.push({
          product_id: product.id,
          product_code: product.product,
          product_name: product.product,
          application: product.application,
          stock: product.stock,
          quantity: item.quantity,
          original_unit_price: originalPrice,
          unit_price: priceWithDiscount,
          total_price: totalPrice,
          discount_id: discountData?.id || null,
          discount_percentage: discountPercentage,
          discount_amount: totalDiscountAmount,
          commission_percentage: commissionPercentage,
          commission_amount: commissionAmount,
        });
      } else {
        notFound.push(item.code);
      }
    }

    // Preparar dados para inserção em lote
    const orderItemsToInsert = found.map((item) => ({
      order_id: orderId,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      original_unit_price: item.original_unit_price,
      discount_id: item.discount_id,
      discount_percentage: item.discount_percentage,
      discount_amount: item.discount_amount,
      total_price: item.total_price,
      commission_percentage: item.commission_percentage,
      commission_amount: item.commission_amount,
      client_ref: null, // Pode ser adicionado futuramente
    }));

    // Inserir itens no pedido
    let insertedItems = [];
    if (orderItemsToInsert.length > 0) {
      const { data: inserted, error: insertError } = await supabase
        .from("order_items")
        .insert(orderItemsToInsert)
        .select();

      if (insertError) {
        console.error("Erro ao inserir itens no pedido:", insertError);
        return NextResponse.json(
          { error: "Erro ao adicionar itens ao pedido" },
          { status: 500 }
        );
      }

      insertedItems = inserted || [];
    }

    // Preparar resposta
    const response = {
      success: true,
      statistics: {
        total: normalizedItems.length,
        found: found.length,
        notFound: notFound.length,
        inserted: insertedItems.length,
      },
      results: {
        found: found.map((item) => ({
          code: item.product_code,
          name: item.product_name,
          application: item.application,
          stock: item.stock,
          quantity: item.quantity,
          originalPrice: item.original_unit_price,
          priceWithDiscount: item.unit_price,
          totalPrice: item.total_price,
          discountAmount: item.discount_amount,
        })),
        notFound,
      },
      discountApplied: discountData
        ? {
            id: discountData.id,
            name: discountData.name,
            percentage: discountData.discount_percentage,
          }
        : null,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Erro na API bulk-add-items:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
