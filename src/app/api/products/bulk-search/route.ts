import { createServerClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

interface BulkSearchRequest {
  productCodes: string[];
  discountId?: string;
}

interface ProductResult {
  product: string;
  stock: number;
  price: number;
  application?: string;
  found: boolean;
  discountedPrice?: number;
  discountPercentage?: number;
}

export async function POST(request: NextRequest) {
  try {
    const { productCodes, discountId }: BulkSearchRequest =
      await request.json();

    if (
      !productCodes ||
      !Array.isArray(productCodes) ||
      productCodes.length === 0
    ) {
      return NextResponse.json(
        {
          error: "Lista de códigos de produtos é obrigatória",
        },
        { status: 400 }
      );
    }

    // Limitar a 50 produtos por consulta para performance
    if (productCodes.length > 50) {
      return NextResponse.json(
        {
          error: "Máximo de 50 produtos por consulta",
        },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();

    // Limpar e normalizar códigos
    const cleanCodes = productCodes
      .map((code) => code.trim().toUpperCase())
      .filter((code) => code.length > 0);

    // Buscar produtos
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("product, stock, price, application")
      .in("product", cleanCodes);

    if (productsError) {
      console.error("Erro ao buscar produtos:", productsError);
      return NextResponse.json(
        {
          error: "Erro ao buscar produtos",
        },
        { status: 500 }
      );
    }

    // Buscar desconto se fornecido
    let discount = null;
    if (discountId) {
      const { data: discountData, error: discountError } = await supabase
        .from("discounts")
        .select("id, name, discount_percentage, commission_percentage")
        .eq("id", discountId)
        .eq("active", true)
        .single();

      if (discountError) {
        console.error("Erro ao buscar desconto:", discountError);
        return NextResponse.json(
          {
            error: "Desconto não encontrado ou inativo",
          },
          { status: 400 }
        );
      }

      discount = discountData;
    }

    // Criar mapa de produtos encontrados
    const productsMap = new Map<string, any>();
    products?.forEach((product) => {
      productsMap.set(product.product.toUpperCase(), product);
    });

    // Montar resultado mantendo a ordem original
    const results: ProductResult[] = cleanCodes.map((code) => {
      const product = productsMap.get(code);

      if (!product) {
        return {
          product: code,
          stock: 0,
          price: 0,
          found: false,
        };
      }

      let discountedPrice = product.price;
      let discountPercentage = 0;

      if (discount && discount.discount_percentage) {
        discountPercentage =
          parseFloat(discount.discount_percentage.toString()) || 0;
        const discountAmount = (product.price * discountPercentage) / 100;
        discountedPrice = product.price - discountAmount;
      }

      return {
        product: product.product,
        stock: product.stock,
        price: product.price,
        application: product.application,
        found: true,
        discountedPrice: Math.round(discountedPrice * 100) / 100,
        discountPercentage,
      };
    });

    return NextResponse.json({
      success: true,
      data: results,
      discount: discount
        ? {
            id: discount.id,
            name: discount.name,
            percentage: discount.discount_percentage,
          }
        : null,
      summary: {
        total: cleanCodes.length,
        found: results.filter((r) => r.found).length,
        notFound: results.filter((r) => !r.found).length,
      },
    });
  } catch (error) {
    console.error("Erro na API de busca em lote:", error);
    return NextResponse.json(
      {
        error: "Erro interno do servidor",
      },
      { status: 500 }
    );
  }
}
