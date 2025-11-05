import { createServerClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerClient();

    const { data: items, error } = await supabase
      .from("order_items")
      .select(
        `
        *,
        products:product_id (
          id,
          product,
          price,
          application,
          group_id,
          product_groups(name)
        ),
        discounts:discount_id (
          id,
          name,
          discount_percentage,
          commission_percentage
        )
      `
      )
      .eq("order_id", id)
      .order("client_ref", { nullsFirst: false }) // ✅ Ordenar por client_ref primeiro (para bulk add)
      .order("created_at"); // Depois por created_at

    if (error) {
      console.error("❌ Erro do Supabase ao buscar itens:", error);
      return NextResponse.json(
        { error: "Erro ao buscar itens do pedido" },
        { status: 500 }
      );
    }

    return NextResponse.json(items || []);
  } catch (error) {
    console.error("❌ Erro na API order items:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await request.json();
    const supabase = await createServerClient();

    // Validações básicas
    if (!data.product_id || !data.quantity || !data.unit_price) {
      return NextResponse.json(
        { error: "Dados obrigatórios não fornecidos" },
        { status: 400 }
      );
    }

    // Calcular valores
    const subtotal = data.quantity * data.unit_price;
    const discountAmount = (subtotal * (data.discount_percentage || 0)) / 100;
    const totalPrice = subtotal - discountAmount;

    const itemData = {
      order_id: id,
      product_id: data.product_id,
      quantity: data.quantity,
      unit_price: data.unit_price,
      original_unit_price: data.original_unit_price || data.unit_price,
      discount_percentage: data.discount_percentage || 0,
      discount_amount: discountAmount,
      total_price: totalPrice,
      discount_id: data.discount_id || null,
      client_ref: data.client_ref || null,
      commission_percentage: data.commission_percentage || 0,
      commission_amount: (totalPrice * (data.commission_percentage || 0)) / 100,
    };

    const { data: newItem, error } = await supabase
      .from("order_items")
      .insert(itemData)
      .select()
      .single();

    if (error) {
      console.error("Erro do Supabase:", error);
      return NextResponse.json(
        { error: "Erro ao adicionar item ao pedido" },
        { status: 500 }
      );
    }

    return NextResponse.json(newItem, { status: 201 });
  } catch (error) {
    console.error("Erro na API order items POST:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
