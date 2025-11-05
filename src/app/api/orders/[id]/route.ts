import { createServerClient } from "@/shared/infrastructure/lib/supabase/server";
import { SessionService } from "@/shared/infrastructure/services/session.service";
import { NextRequest, NextResponse } from "next/server";

// ✅ FUNÇÃO DE VALIDAÇÃO: Verifica se usuário pode acessar o recurso
async function canUserAccessOrder(
  supabase: any,
  orderId: string,
  userId: string,
  isAdmin: boolean
): Promise<boolean> {
  if (isAdmin) return true; // Admin pode acessar tudo

  const { data: order } = await supabase
    .from("orders")
    .select("user_id")
    .eq("id", orderId)
    .single();

  return order?.user_id === userId;
}

// ✅ FUNÇÃO DE VALIDAÇÃO: Verifica se cliente pertence ao usuário
async function canUserAccessClient(
  supabase: any,
  clientId: number,
  userId: string,
  isAdmin: boolean
): Promise<boolean> {
  if (isAdmin) return true; // Admin pode acessar todos os clientes

  const { data: client } = await supabase
    .from("clients")
    .select("user_id")
    .eq("id", clientId)
    .single();

  return client?.user_id === userId;
}

// GET /api/orders/[id] - Buscar pedido específico
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;
    const supabase = await createServerClient();

    // ✅ CORREÇÃO: Usar SessionService para funcionar no servidor
    const currentUser = await SessionService.getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: "Usuário não autenticado" },
        { status: 401 }
      );
    }

    const userId = currentUser.id;

    // Buscar o pedido with informações completas
    let query = supabase
      .from("orders")
      .select(
        `
        id,
        order_number,
        client_id,
        status,
        subtotal,
        total_discount,
        total,
        shipping_rate,
        payment_condition_id,
        notes,
        created_at,
        updated_at,
        user_id,
        clients:client_id (
          id,
          code,
          client,
          city,
          cnpj
        ),
        payment_conditions:payment_condition_id (
          id,
          name,
          description,
          installments,
          is_cash
        ),
        order_items (
          id,
          product_id,
          quantity,
          unit_price,
          original_unit_price,
          discount_percentage,
          discount_amount,
          total_price,
          commission_percentage,
          discount_id,
          client_ref,
          pending_quantity,
          has_pending,
          created_at,
          updated_at,
          products:product_id (
            id,
            product,
            price,
            stock,
            application,
            group_id,
            product_groups(name)
          ),
          discounts:discount_id (
            id,
            name,
            discount_percentage
          )
        )
      `
      )
      .eq("id", orderId);

    // ✅ CORREÇÃO: Aplicar filtro por usuário
    if (!currentUser.is_admin) {
      query = query.eq("user_id", userId);
    }

    const { data: order, error } = await query.single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Pedido não encontrado" },
          { status: 404 }
        );
      }
      console.error("Error fetching order:", error);
      return NextResponse.json(
        { error: "Erro ao buscar pedido" },
        { status: 500 }
      );
    }

    // ✅ CORREÇÃO: Calcular total_commission para o pedido individual
    const totalCommission = (order.order_items || []).reduce(
      (sum: number, item: any) => {
        // ✅ CORREÇÃO: Usar quantity * unit_price para ser consistente com OrderForm
        const itemTotal =
          Number(item.quantity || 0) * Number(item.unit_price || 0);
        const commissionPercentage = Number(item.commission_percentage || 0);
        const itemCommission = (itemTotal * commissionPercentage) / 100;
        return sum + itemCommission;
      },
      0
    );

    const orderWithCommission = {
      ...order,
      total_commission: Number(totalCommission.toFixed(2)),
    };

    return NextResponse.json({ order: orderWithCommission });
  } catch (error) {
    console.error("GET Order API error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

// PUT /api/orders/[id] - Atualizar pedido
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;
    const supabase = await createServerClient();
    const body = await request.json();

    // ✅ CORREÇÃO: Usar SessionService para funcionar no servidor
    const currentUser = await SessionService.getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: "Usuário não autenticado" },
        { status: 401 }
      );
    }

    const userId = currentUser.id;

    // ✅ VALIDAÇÃO DE SEGURANÇA: Verificar se usuário pode acessar este pedido
    const canAccess = await canUserAccessOrder(
      supabase,
      orderId,
      userId,
      currentUser.is_admin
    );
    if (!canAccess) {
      return NextResponse.json(
        { error: "Acesso negado: Pedido não encontrado ou sem permissão" },
        { status: 403 }
      );
    }

    const {
      client_id,
      items,
      payment_condition_id,
      notes,
      status,
      shipping_rate,
    } = body;

    // Verificar se é apenas atualização de status ou pedido completo
    if (status && !items) {
      // Atualização apenas do status
      let statusQuery = supabase
        .from("orders")
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      // ✅ CORREÇÃO: Aplicar filtro por usuário
      if (!currentUser.is_admin) {
        statusQuery = statusQuery.eq("user_id", userId);
      }

      const { error: statusError } = await statusQuery;

      if (statusError) {
        console.error("Error updating order status:", statusError);
        return NextResponse.json(
          { error: "Erro ao atualizar status do pedido" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        message: "Status do pedido atualizado com sucesso",
      });
    }

    // Validações para atualização completa
    if (!client_id || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Dados inválidos para atualização do pedido" },
        { status: 400 }
      );
    }

    // Calcular novos totais
    const subtotal = items.reduce((sum: number, item: any) => {
      return sum + item.quantity * item.unit_price;
    }, 0);

    const totalDiscount = items.reduce((sum: number, item: any) => {
      const itemSubtotal = item.quantity * item.unit_price;
      const discountAmount =
        (itemSubtotal * (item.discount_percentage || 0)) / 100;
      return sum + discountAmount;
    }, 0);

    // 🔥 NOVO: Verificar se há itens com pendência
    const hasPendingItems = items.some(
      (item: any) => item.has_pending === true
    );

    // ✅ CORREÇÃO: Total deve ser subtotal + frete (sem subtrair desconto, pois unit_price já é com desconto)
    const total = subtotal + (shipping_rate || 0);

    // Preparar dados de atualização
    const updateData: any = {
      client_id,
      subtotal,
      total_discount: totalDiscount,
      total,
      payment_condition_id: payment_condition_id || null,
      notes: notes || null,
      shipping_rate: shipping_rate || 0,
      has_pending_items: hasPendingItems, // 🔥 NOVO: Campo de pendência do pedido
      updated_at: new Date().toISOString(),
    };

    if (status) {
      updateData.status = status;
    }

    // Atualizar o pedido
    let updateQuery = supabase
      .from("orders")
      .update(updateData)
      .eq("id", orderId);

    // ✅ CORREÇÃO: Aplicar filtro por usuário
    if (!currentUser.is_admin) {
      updateQuery = updateQuery.eq("user_id", userId);
    }

    const { error: orderError } = await updateQuery;

    if (orderError) {
      console.error("Error updating order:", orderError);
      return NextResponse.json(
        { error: "Erro ao atualizar pedido" },
        { status: 500 }
      );
    }

    // Atualizar itens do pedido
    // Primeiro, remover itens existentes
    const { error: deleteItemsError } = await supabase
      .from("order_items")
      .delete()
      .eq("order_id", orderId);

    if (deleteItemsError) {
      console.error("Error deleting existing order items:", deleteItemsError);
      return NextResponse.json(
        { error: "Erro ao atualizar itens do pedido" },
        { status: 500 }
      );
    }

    // Inserir novos itens
    const orderItems = items.map((item: any) => {
      const itemSubtotal = item.quantity * item.unit_price;
      const discountAmount =
        (itemSubtotal * (item.discount_percentage || 0)) / 100;
      const itemTotal = itemSubtotal - discountAmount;

      return {
        order_id: orderId,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        original_unit_price: item.original_unit_price || item.unit_price,
        discount_percentage: item.discount_percentage || 0,
        discount_amount: discountAmount,
        total_price: itemTotal,
        commission_percentage: item.commission_percentage || 0,
        discount_id: item.discount_id || null,
        client_ref: item.client_ref || null,
        pending_quantity: item.pending_quantity || 0, // 🔥 NOVO: Quantidade pendente
        has_pending: item.has_pending || false, // 🔥 NOVO: Flag de pendência
        created_at: new Date().toISOString(),
      };
    });

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItems);

    if (itemsError) {
      console.error("Error creating new order items:", itemsError);
      return NextResponse.json(
        { error: "Erro ao criar novos itens do pedido" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Pedido atualizado com sucesso",
    });
  } catch (error) {
    console.error("PUT Order API error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

// DELETE /api/orders/[id] - Excluir pedido
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;
    const supabase = await createServerClient();

    // ✅ CORREÇÃO: Usar SessionService para funcionar no servidor
    const currentUser = await SessionService.getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: "Usuário não autenticado" },
        { status: 401 }
      );
    }

    const userId = currentUser.id;

    // Verificar se o pedido existe e pertence ao usuário
    let orderQuery = supabase
      .from("orders")
      .select("id, status, order_number")
      .eq("id", orderId);

    // ✅ CORREÇÃO: Aplicar filtro por usuário
    if (!currentUser.is_admin) {
      orderQuery = orderQuery.eq("user_id", userId);
    }

    const { data: orderData, error: orderError } = await orderQuery.single();

    if (orderError) {
      if (orderError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Pedido não encontrado" },
          { status: 404 }
        );
      }
      console.error("Error checking order:", orderError);
      return NextResponse.json(
        { error: "Erro ao verificar pedido" },
        { status: 500 }
      );
    }

    // Verificar se o pedido pode ser excluído (rascunhos e confirmados)
    if (orderData.status !== "draft" && orderData.status !== "confirmed") {
      return NextResponse.json(
        {
          error:
            "Apenas pedidos em rascunho ou confirmados podem ser excluídos",
        },
        { status: 400 }
      );
    }

    // Primeiro, excluir os itens do pedido
    const { error: deleteItemsError } = await supabase
      .from("order_items")
      .delete()
      .eq("order_id", orderId);

    if (deleteItemsError) {
      console.error("Error deleting order items:", deleteItemsError);
      return NextResponse.json(
        { error: "Erro ao excluir itens do pedido" },
        { status: 500 }
      );
    }

    // Em seguida, excluir o pedido
    let finalDeleteQuery = supabase.from("orders").delete().eq("id", orderId);

    // ✅ CORREÇÃO: Aplicar filtro por usuário
    if (!currentUser.is_admin) {
      finalDeleteQuery = finalDeleteQuery.eq("user_id", userId);
    }

    const { error: deleteOrderError } = await finalDeleteQuery;

    if (deleteOrderError) {
      console.error("Error deleting order:", deleteOrderError);
      return NextResponse.json(
        { error: "Erro ao excluir pedido" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: `Pedido ${orderData.order_number} excluído com sucesso`,
      orderNumber: orderData.order_number,
    });
  } catch (error) {
    console.error("DELETE Order API error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
