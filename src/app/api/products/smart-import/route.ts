import { createServerClient } from "@/lib/supabase/server";
import { type NextRequest, NextResponse } from "next/server";

interface ProductImportData {
  id?: string;
  product: string;
  stock: number;
  price: number;
  application?: string | null;
  group_id?: number | null;
}

export async function POST(request: NextRequest) {
  try {
    const { products, strategy = "auto" } = await request.json();

    if (!products || !Array.isArray(products)) {
      return NextResponse.json(
        { error: "Dados de produtos inválidos" },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();

    const sanitizeText = (value: any): string | null => {
      if (value === undefined || value === null) return null;
      const str = String(value)
        .replace(/[\x00-\x1F\x7F]/g, "")
        .trim();
      return str.length > 0 ? str : null;
    };

    // Função para validar e limitar valores numéricos
    const validateAndParsePrice = (price: any): number => {
      const numPrice = Number.parseFloat(price);
      if (isNaN(numPrice)) return 0.0;
      if (numPrice > 99999999.99) return 99999999.99;
      if (numPrice < 0) return 0.0;
      return Math.round(numPrice * 100) / 100;
    };

    const validateAndParseStock = (stock: any): number => {
      const numStock = Number.parseInt(stock);
      if (isNaN(numStock)) return 0;
      if (numStock < 0) return 0;
      if (numStock > 2147483647) return 2147483647;
      return numStock;
    };

    // Preparar dados para UPSERT
    const validProducts = products.map(
      (product: ProductImportData, index: number) => {
        if (!product.product || product.product.trim() === "") {
          throw new Error(`Linha ${index + 1}: Nome do produto é obrigatório`);
        }

        const now = new Date().toISOString();

        return {
          ...(product.id && { id: product.id }), // Inclui ID apenas se fornecido
          product: sanitizeText(product.product)!,
          stock: validateAndParseStock(product.stock),
          price: validateAndParsePrice(product.price),
          application: sanitizeText(product.application),
          ...(product.group_id !== undefined && product.group_id !== null
            ? { group_id: Number.parseInt(String(product.group_id)) || null }
            : {}),
          updated_at: now,
          ...(!product.id && { created_at: now }), // created_at apenas para novos registros
        };
      }
    );

    let insertedCount = 0;
    let updatedCount = 0;
    let unchangedCount = 0;
    const errors: string[] = [];

    // Função para deduplificar produtos por nome dentro de um lote
    const deduplicateBatch = (batch: any[]) => {
      const seen = new Map<string, any>();

      for (const product of batch) {
        const key = product.product.toLowerCase().trim();

        if (seen.has(key)) {
          // Se já existe, usar o mais recente (último no array)
          // Manter o maior estoque e preço mais recente
          const existing = seen.get(key);
          seen.set(key, {
            ...existing,
            stock: Math.max(existing.stock, product.stock),
            price: product.price, // Usar o preço mais recente
            application: product.application || existing.application,
            updated_at: product.updated_at,
          });
        } else {
          seen.set(key, product);
        }
      }

      return Array.from(seen.values());
    };

    // Estratégia de importação baseada na presença de IDs
    const batchSize = 500;

    for (let i = 0; i < validProducts.length; i += batchSize) {
      const batch = validProducts.slice(i, i + batchSize);

      // Deduplificar o lote antes de enviar
      const deduplicatedBatch = deduplicateBatch(batch);

      // Log se houve deduplificação
      if (deduplicatedBatch.length < batch.length) {
        console.log(
          `Lote ${Math.floor(i / batchSize) + 1}: ${
            batch.length - deduplicatedBatch.length
          } duplicatas removidas (${batch.length} → ${
            deduplicatedBatch.length
          })`
        );
      }

      try {
        if (strategy === "upsert_by_name" || strategy === "auto") {
          // ✅ UPSERT por nome do produto (agora funciona com UNIQUE index)
          // Remove o ID dos dados para forçar UPSERT apenas por nome
          const batchWithoutId = deduplicatedBatch.map((item) => {
            const { id, ...itemWithoutId } = item;
            return itemWithoutId;
          });

          const { data, error } = await supabase
            .from("products")
            .upsert(batchWithoutId, {
              onConflict: "product",
              ignoreDuplicates: false,
            })
            .select();

          if (error) {
            console.error("Erro no UPSERT por nome:", error);
            errors.push(
              `Lote ${Math.floor(i / batchSize) + 1}: ${error.message}`
            );
            continue;
          }

          // Contagem inteligente: detecta inserções vs atualizações
          if (data) {
            for (const item of data) {
              const timeDiff = Math.abs(
                new Date(item.created_at).getTime() -
                  new Date(item.updated_at).getTime()
              );

              if (timeDiff < 1000) {
                // Produto novo: created_at ≈ updated_at
                insertedCount++;
              } else {
                // Produto existente: verificar se foi realmente atualizado
                const now = new Date().getTime();
                const updatedTime = new Date(item.updated_at).getTime();

                if (now - updatedTime < 5000) {
                  updatedCount++;
                } else {
                  unchangedCount++;
                }
              }
            }
          }
        } else if (
          strategy === "upsert_by_id" &&
          deduplicatedBatch.some((p) => p.id)
        ) {
          // UPSERT por ID (apenas quando IDs são explicitamente fornecidos)
          const { data, error } = await supabase
            .from("products")
            .upsert(deduplicatedBatch, {
              onConflict: "id",
              ignoreDuplicates: false,
            })
            .select();

          if (error) {
            console.error("Erro no UPSERT por ID:", error);
            errors.push(
              `Lote ${Math.floor(i / batchSize) + 1}: ${error.message}`
            );
            continue;
          }

          // Mesma lógica de contagem inteligente para UPSERT por ID
          if (data) {
            for (const item of data) {
              const timeDiff = Math.abs(
                new Date(item.created_at).getTime() -
                  new Date(item.updated_at).getTime()
              );

              if (timeDiff < 1000) {
                insertedCount++;
              } else {
                const now = new Date().getTime();
                const updatedTime = new Date(item.updated_at).getTime();

                if (now - updatedTime < 5000) {
                  updatedCount++;
                } else {
                  unchangedCount++;
                }
              }
            }
          }
        } else {
          // INSERT simples (estratégia insert_only)
          const { data, error } = await supabase
            .from("products")
            .insert(deduplicatedBatch)
            .select();

          if (error) {
            console.error("Erro no INSERT:", error);
            errors.push(
              `Lote ${Math.floor(i / batchSize) + 1}: ${error.message}`
            );
            continue;
          }

          insertedCount += data?.length || 0;
        }
      } catch (batchError) {
        console.error("Erro no processamento do lote:", batchError);
        errors.push(`Lote ${Math.floor(i / batchSize) + 1}: ${batchError}`);
      }
    }

    const totalProcessed = insertedCount + updatedCount + unchangedCount;

    return NextResponse.json({
      success: totalProcessed > 0,
      strategy: strategy,
      statistics: {
        totalProcessed: validProducts.length,
        inserted: insertedCount,
        updated: updatedCount,
        unchanged: unchangedCount,
        errors: errors.length,
      },
      message: `Importação concluída: ${insertedCount} inseridos, ${updatedCount} atualizados, ${unchangedCount} sem alterações`,
      errors: errors.slice(0, 10), // Limitar erros retornados
    });
  } catch (error) {
    console.error("Erro na API de importação inteligente:", error);
    return NextResponse.json(
      {
        error: `Erro interno do servidor: ${error}`,
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}

// GET - Endpoint para verificar estratégias disponíveis
export async function GET() {
  return NextResponse.json({
    strategies: {
      auto: "Detecta automaticamente se deve usar ID ou nome para UPSERT",
      upsert_by_id: "UPSERT baseado no campo ID (requer ID nos dados)",
      upsert_by_name: "UPSERT baseado no nome do produto (evita duplicatas)",
      insert_only: "Apenas inserção (pode gerar duplicatas)",
    },
    recommendations: {
      "Com IDs conhecidos": "upsert_by_id",
      "Sem IDs, evitar duplicatas": "upsert_by_name",
      "Dados novos garantidos": "insert_only",
      "Não sei qual usar": "auto",
    },
  });
}
