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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const clientId = searchParams.get("clientId") || "";
    const dateFrom = searchParams.get("dateFrom") || "";
    const dateTo = searchParams.get("dateTo") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    // ✅ DEMO: Parâmetro temporário para simular outro usuário
    const demoUserId = searchParams.get("demoUserId");

    // ✅ Usar o servidor client corretamente
    const supabase = await createServerClient();

    // Obter usuário atual
    const currentUser = await SessionService.getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: "Usuário não autenticado" },
        { status: 401 }
      );
    }

    // ✅ DEMO: Se for admin e tiver demoUserId, usar o demo
    let userId = currentUser.id;
    if (currentUser.is_admin && demoUserId) {
      userId = demoUserId;
      console.log(`🎭 DEMO: Admin visualizando como usuário ${demoUserId}`);
    }

    const offset = (page - 1) * limit;

    console.log("🔍 Buscando pedidos para usuário:", userId);
    console.log(
      "👤 Tipo de usuário:",
      currentUser.is_admin ? "Admin" : "Usuário regular"
    );
    console.log("📊 Parâmetros de busca:", {
      search,
      status,
      clientId,
      dateFrom,
      dateTo,
      page,
      limit,
    });

    // Query base com joins
    let query = supabase
      .from("orders")
      .select(
        `
        *,
        clients!inner(id, code, client),
        payment_conditions!inner(id, name),
        order_items(
          *,
          products(product)
        )
      `
      )
      .order("created_at", { ascending: false });

    // ✅ CORREÇÃO: Aplicar filtro por usuário (usuários não-admin sempre, admin apenas em modo demo)
    if (!currentUser.is_admin) {
      query = query.eq("user_id", userId);
    } else if (demoUserId) {
      // Admin em modo demo - filtrar pelo usuário simulado
      query = query.eq("user_id", userId);
    }
    // Admin sem modo demo vê todos os pedidos

    // Aplicar filtros adicionais
    if (status) {
      query = query.eq("status", status);
    }

    if (clientId) {
      query = query.eq("client_id", clientId);
    }

    if (dateFrom) {
      query = query.gte("created_at", new Date(dateFrom).toISOString());
    }

    if (dateTo) {
      const endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999);
      query = query.lte("created_at", endDate.toISOString());
    }

    // Filtro por busca textual
    if (search) {
      // Primeiro, buscar clientes que correspondem à busca
      const { data: matchingClients } = await supabase
        .from("clients")
        .select("id")
        .or(`code.ilike.%${search}%,client.ilike.%${search}%`);

      if (matchingClients && matchingClients.length > 0) {
        const clientIds = matchingClients.map((c) => c.id);

        // Buscar pedidos por clientes ou por order_number
        let ordersByClientQuery = supabase
          .from("orders")
          .select(
            `
            *,
            clients!inner(id, code, client),
            payment_conditions!inner(id, name),
            order_items(
              *,
              products(product)
            )
          `
          )
          .in("client_id", clientIds);

        let ordersByNumberQuery = supabase
          .from("orders")
          .select(
            `
            *,
            clients!inner(id, code, client),
            payment_conditions!inner(id, name),
            order_items(
              *,
              products(product)
            )
          `
          )
          .ilike("order_number", `%${search}%`);

        // ✅ CORREÇÃO CRÍTICA: Aplicar filtro de usuário nas buscas textuais
        if (!currentUser.is_admin) {
          ordersByClientQuery = ordersByClientQuery.eq("user_id", userId);
          ordersByNumberQuery = ordersByNumberQuery.eq("user_id", userId);
        }

        const { data: ordersByClient } = await ordersByClientQuery;
        const { data: ordersByNumber } = await ordersByNumberQuery;

        // Combinar resultados e remover duplicatas
        const combinedOrders = [
          ...(ordersByClient || []),
          ...(ordersByNumber || []),
        ];
        const uniqueOrders = combinedOrders.filter(
          (order, index, self) =>
            index === self.findIndex((o) => o.id === order.id)
        );

        // Filtro por usuário já aplicado nas queries acima
        const filteredOrders = uniqueOrders;

        // Aplicar filtros adicionais
        let finalOrders = filteredOrders;

        if (status) {
          finalOrders = finalOrders.filter((order) => order.status === status);
        }

        if (clientId) {
          finalOrders = finalOrders.filter(
            (order) => order.client_id === parseInt(clientId)
          );
        }

        if (dateFrom) {
          const fromDate = new Date(dateFrom);
          finalOrders = finalOrders.filter(
            (order) => new Date(order.created_at) >= fromDate
          );
        }

        if (dateTo) {
          const toDate = new Date(dateTo);
          toDate.setHours(23, 59, 59, 999);
          finalOrders = finalOrders.filter(
            (order) => new Date(order.created_at) <= toDate
          );
        }

        // Ordenar por data de criação (mais recentes primeiro)
        finalOrders.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        // ✅ CORREÇÃO: Calcular total_commission para pedidos da busca
        const ordersWithCommission = finalOrders.map((order) => {
          const totalCommission = (order.order_items || []).reduce(
            (sum: number, item: any) => {
              // ✅ CORREÇÃO: Usar quantity * unit_price para ser consistente com OrderForm
              const itemTotal =
                Number(item.quantity || 0) * Number(item.unit_price || 0);
              const commissionPercentage = Number(
                item.commission_percentage || 0
              );
              const itemCommission = (itemTotal * commissionPercentage) / 100;
              return sum + itemCommission;
            },
            0
          );

          return {
            ...order,
            total_commission: Number(totalCommission.toFixed(2)),
          };
        });

        const totalCount = ordersWithCommission.length;
        const paginatedOrders = ordersWithCommission.slice(
          offset,
          offset + limit
        );

        return NextResponse.json({
          orders: paginatedOrders,
          totalCount,
          page,
          limit,
          totalPages: Math.ceil(totalCount / limit),
        });
      }

      // Se não encontrou clientes, buscar apenas por order_number
      query = query.ilike("order_number", `%${search}%`);
    }

    // Aplicar paginação
    const countQuery = supabase
      .from("orders")
      .select("*", { count: "exact", head: true });

    // ✅ CORREÇÃO: Aplicar filtro por usuário no count também
    if (!currentUser.is_admin) {
      countQuery.eq("user_id", userId);
    } else if (demoUserId) {
      // Admin em modo demo - filtrar pelo usuário simulado
      countQuery.eq("user_id", userId);
    }

    if (status) {
      countQuery.eq("status", status);
    }

    const { count } = await countQuery;

    query = query.range(offset, offset + limit - 1);

    const { data: orders, error } = await query;

    if (error) {
      console.error("Error fetching orders:", error);
      return NextResponse.json(
        { error: "Erro ao buscar pedidos" },
        { status: 500 }
      );
    }

    // ✅ CORREÇÃO: Calcular total_commission para cada pedido
    const ordersWithCommission = (orders || []).map((order) => {
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

      return orderWithCommission;
    });

    console.log(
      `✅ Encontrados ${
        ordersWithCommission?.length || 0
      } pedidos para usuário ${userId} (${
        currentUser.is_admin ? "Admin" : "Usuário regular"
      })`
    );

    return NextResponse.json({
      orders: ordersWithCommission || [],
      totalCount: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error("Orders API error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const orderData = await request.json();

    // ✅ Usar o servidor client corretamente
    const supabase = await createServerClient();

    // Obter usuário atual
    const currentUser = await SessionService.getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: "Usuário não autenticado" },
        { status: 401 }
      );
    }

    const userId = currentUser.id;

    console.log("Criando pedido para usuário:", userId);

    // ✅ VALIDAÇÃO DE SEGURANÇA: Verificar se o usuário pode criar pedidos para este cliente
    if (orderData.client_id) {
      const canAccess = await canUserAccessClient(
        supabase,
        orderData.client_id,
        userId,
        currentUser.is_admin
      );
      if (!canAccess) {
        return NextResponse.json(
          { error: "Acesso negado: Cliente não pertence ao usuário" },
          { status: 403 }
        );
      }
    }

    // Gerar próximo número do pedido
    const { data: lastOrder, error: lastOrderError } = await supabase
      .from("orders")
      .select("order_number")
      .order("created_at", { ascending: false })
      .limit(1);

    if (lastOrderError) {
      console.error("Erro ao buscar último pedido:", lastOrderError);
      return NextResponse.json(
        { error: "Erro ao gerar número do pedido" },
        { status: 500 }
      );
    }

    const nextOrderNumber =
      lastOrder && lastOrder.length > 0
        ? (parseInt(lastOrder[0].order_number) + 1).toString()
        : "1";

    // Preparar dados do pedido principal
    // ✅ CORREÇÃO: Calcular totais baseado nos itens (quantity * unit_price)
    const subtotal =
      orderData.items?.reduce(
        (sum: number, item: any) => sum + item.quantity * item.unit_price,
        0
      ) || 0;

    const totalDiscount =
      orderData.items?.reduce(
        (sum: number, item: any) => sum + (item.discount_amount || 0),
        0
      ) || 0;

    // 🔥 NOVO: Verificar se há itens com pendência
    const hasPendingItems =
      orderData.items?.some((item: any) => item.has_pending === true) || false;

    // ✅ CORREÇÃO: Total deve ser subtotal + frete (sem subtrair desconto, pois unit_price já é com desconto)
    const total = subtotal + (orderData.shipping_rate || 0);

    const newOrder = {
      order_number: nextOrderNumber,
      client_id: orderData.client_id,
      payment_condition_id: orderData.payment_condition_id,
      status: orderData.status || "draft",
      subtotal: subtotal,
      total_discount: totalDiscount,
      total: total,
      notes: orderData.notes || null,
      user_id: userId,
      shipping_rate: orderData.shipping_rate || 0,
      has_pending_items: hasPendingItems, // 🔥 NOVO: Campo de pendência do pedido
    };

    // Inserir pedido
    const { data: createdOrder, error: orderError } = await supabase
      .from("orders")
      .insert(newOrder)
      .select()
      .single();

    if (orderError) {
      console.error("Error creating order:", orderError);
      return NextResponse.json(
        { error: `Erro ao criar pedido: ${orderError.message}` },
        { status: 500 }
      );
    }

    // Inserir itens do pedido se fornecidos
    if (orderData.items && orderData.items.length > 0) {
      const orderItems = orderData.items.map((item: any) => ({
        order_id: createdOrder.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        original_unit_price: item.original_unit_price || item.unit_price,
        discount_id: item.discount_id,
        discount_percentage: item.discount_percentage || 0,
        discount_amount: item.discount_amount || 0,
        total_price: item.total_price,
        commission_percentage: item.commission_percentage || 0,
        client_ref: item.client_ref,
        pending_quantity: item.pending_quantity || 0, // 🔥 NOVO: Quantidade pendente
        has_pending: item.has_pending || false, // 🔥 NOVO: Flag de pendência
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) {
        console.error("Error creating order items:", itemsError);
        // Reverter criação do pedido
        await supabase.from("orders").delete().eq("id", createdOrder.id);

        return NextResponse.json(
          { error: `Erro ao criar itens do pedido: ${itemsError.message}` },
          { status: 500 }
        );
      }
    }

    console.log(
      `✅ Pedido ${nextOrderNumber} criado com sucesso para usuário ${userId}`
    );

    return NextResponse.json({
      order: createdOrder,
      orderNumber: nextOrderNumber,
    });
  } catch (error) {
    console.error("Error in POST /api/orders:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
