import { createServerClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerClient();

    // Buscar o pedido
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, subtotal, total_discount, total, shipping_rate")
      .eq("id", id)
      .single();

    if (orderError) {
      console.error("Erro do Supabase (order):", orderError);
      return NextResponse.json(
        { error: "Pedido não encontrado" },
        { status: 404 }
      );
    }

    // Buscar itens para recalcular se necessário
    const { data: items, error: itemsError } = await supabase
      .from("order_items")
      .select(
        "quantity, unit_price, discount_amount, total_price, commission_amount"
      )
      .eq("order_id", id);

    if (itemsError) {
      console.error("Erro do Supabase (items):", itemsError);
      return NextResponse.json(
        { error: "Erro ao buscar itens do pedido" },
        { status: 500 }
      );
    }

    // Calcular totais baseados nos itens atuais
    const calculatedSubtotal =
      items?.reduce((sum, item) => sum + item.quantity * item.unit_price, 0) ||
      0;

    const calculatedTotalDiscount =
      items?.reduce((sum, item) => sum + item.discount_amount, 0) || 0;

    // ✅ CORREÇÃO: Total deve ser subtotal + frete (sem subtrair desconto, pois unit_price já é com desconto)
    const calculatedTotal = calculatedSubtotal + (order.shipping_rate || 0);

    const calculatedCommission =
      items?.reduce((sum, item) => sum + item.commission_amount, 0) || 0;

    const totals = {
      order_id: id,
      subtotal: calculatedSubtotal,
      total_discount: calculatedTotalDiscount,
      total: calculatedTotal,
      total_commission: calculatedCommission,
      items_count: items?.length || 0,
      // Dados do banco (podem estar desatualizados)
      saved_subtotal: order.subtotal,
      saved_total_discount: order.total_discount,
      saved_total: order.total,
      // Flag para indicar se precisa atualizar
      needs_update:
        Math.abs(calculatedSubtotal - parseFloat(order.subtotal)) > 0.01 ||
        Math.abs(calculatedTotalDiscount - parseFloat(order.total_discount)) >
          0.01 ||
        Math.abs(calculatedTotal - parseFloat(order.total)) > 0.01,
    };

    return NextResponse.json(totals);
  } catch (error) {
    console.error("Erro na API order totals:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerClient();

    // Buscar o pedido para pegar shipping_rate
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("shipping_rate")
      .eq("id", id)
      .single();

    if (orderError) {
      console.error("Erro do Supabase (order):", orderError);
      return NextResponse.json(
        { error: "Pedido não encontrado" },
        { status: 404 }
      );
    }

    // Recalcular totais baseados nos itens
    const { data: items, error: itemsError } = await supabase
      .from("order_items")
      .select("quantity, unit_price, discount_amount, total_price")
      .eq("order_id", id);

    if (itemsError) {
      console.error("Erro do Supabase (items):", itemsError);
      return NextResponse.json(
        { error: "Erro ao buscar itens do pedido" },
        { status: 500 }
      );
    }

    const subtotal =
      items?.reduce((sum, item) => sum + item.quantity * item.unit_price, 0) ||
      0;

    const totalDiscount =
      items?.reduce((sum, item) => sum + item.discount_amount, 0) || 0;

    // ✅ CORREÇÃO: Total deve ser subtotal + frete (sem subtrair desconto, pois unit_price já é com desconto)
    const total = subtotal + (order.shipping_rate || 0);

    // Atualizar totais no pedido
    const { data: updatedOrder, error: updateError } = await supabase
      .from("orders")
      .update({
        subtotal: subtotal,
        total_discount: totalDiscount,
        total: total,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Erro do Supabase (update):", updateError);
      return NextResponse.json(
        { error: "Erro ao atualizar totais do pedido" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      order_id: id,
      subtotal: subtotal,
      total_discount: totalDiscount,
      total: total,
      items_count: items?.length || 0,
      updated: true,
    });
  } catch (error) {
    console.error("Erro na API order totals PUT:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
