import { createServerClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const active = searchParams.get("active");

    const supabase = await createServerClient();

    let query = supabase.from("payment_conditions").select("*").order("name");

    // Filtrar apenas condições ativas se solicitado
    if (active === "true") {
      query = query.eq("active", true);
    }

    const { data: paymentConditions, error } = await query;

    if (error) {
      console.error("Erro do Supabase:", error);
      return NextResponse.json(
        { error: "Erro ao buscar condições de pagamento" },
        { status: 500 }
      );
    }

    return NextResponse.json(paymentConditions || []);
  } catch (error) {
    console.error("Erro na API payment-conditions:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
