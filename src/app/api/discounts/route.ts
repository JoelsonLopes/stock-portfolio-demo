import { createServerClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { searchParams } = new URL(request.url);

    // Parâmetros de busca
    const active = searchParams.get("active");

    // Query base
    let query = supabase
      .from("discounts")
      .select("*")
      .order("name", { ascending: true });

    // Aplicar filtros
    if (active === "true") {
      query = query.eq("active", true);
    }

    // Buscar dados
    const { data, error } = await query;

    if (error) {
      console.error("Erro ao buscar descontos:", error);
      return NextResponse.json(
        { error: "Erro interno do servidor" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: data || [],
      total: data?.length || 0,
    });
  } catch (error) {
    console.error("Erro na API de descontos:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
