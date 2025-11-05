import { createServerClient } from "@/shared/infrastructure/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { codes }: { codes: string[] } = await request.json();

    if (!codes || !Array.isArray(codes) || codes.length === 0) {
      return NextResponse.json(
        { error: "Lista de códigos é obrigatória" },
        { status: 400 }
      );
    }

    // Normalizar códigos
    const cleanCodes = codes.map((code) => code.trim().toUpperCase());

    // Buscar produtos com IDs
    const { data: products, error } = await supabase
      .from("products")
      .select("id, product, price, stock, application")
      .in("product", cleanCodes);

    if (error) {
      console.error("Erro ao buscar produtos:", error);
      return NextResponse.json(
        { error: "Erro ao buscar produtos" },
        { status: 500 }
      );
    }

    return NextResponse.json(products || []);
  } catch (error) {
    console.error("Erro na API quick-search:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
