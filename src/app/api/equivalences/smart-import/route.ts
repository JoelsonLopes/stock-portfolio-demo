import { createServerClient } from "@/lib/supabase/server";
import { type NextRequest, NextResponse } from "next/server";

interface EquivalenceImportData {
  id?: string;
  product_code: string;
  equivalent_code: string;
}

export async function POST(request: NextRequest) {
  try {
    const { equivalences, strategy = "auto" } = await request.json();

    if (!equivalences || !Array.isArray(equivalences)) {
      return NextResponse.json(
        { error: "Dados de equivalências inválidos" },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();

    // Preparar dados para UPSERT
    const validEquivalences = equivalences.map(
      (equivalence: EquivalenceImportData, index: number) => {
        if (
          !equivalence.product_code ||
          equivalence.product_code.trim() === ""
        ) {
          throw new Error(
            `Linha ${index + 1}: Código do produto é obrigatório`
          );
        }

        if (
          !equivalence.equivalent_code ||
          equivalence.equivalent_code.trim() === ""
        ) {
          throw new Error(
            `Linha ${index + 1}: Código equivalente é obrigatório`
          );
        }

        const now = new Date().toISOString();

        return {
          ...(equivalence.id && { id: equivalence.id }), // Inclui ID apenas se fornecido
          product_code: equivalence.product_code.trim(),
          equivalent_code: equivalence.equivalent_code.trim(),
          updated_at: now,
          ...(!equivalence.id && { created_at: now }), // created_at apenas para novos registros
        };
      }
    );

    let insertedCount = 0;
    let updatedCount = 0;
    let unchangedCount = 0;
    const errors: string[] = [];

    // Função para deduplificar equivalências por product_code + equivalent_code
    const deduplicateBatch = (batch: any[]) => {
      const seen = new Map<string, any>();

      for (const equivalence of batch) {
        const key = `${equivalence.product_code
          .toLowerCase()
          .trim()}|${equivalence.equivalent_code.toLowerCase().trim()}`;

        if (seen.has(key)) {
          // Se já existe, usar o mais recente (último no array)
          const existing = seen.get(key);
          seen.set(key, {
            ...existing,
            updated_at: equivalence.updated_at, // Usar timestamp mais recente
          });
        } else {
          seen.set(key, equivalence);
        }
      }

      return Array.from(seen.values());
    };

    // Estratégia de importação
    const batchSize = 500;

    for (let i = 0; i < validEquivalences.length; i += batchSize) {
      const batch = validEquivalences.slice(i, i + batchSize);

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
        if (strategy === "upsert_by_codes" || strategy === "auto") {
          // UPSERT por product_code + equivalent_code (estratégia principal)
          // Remove o ID dos dados para forçar UPSERT apenas por códigos
          const batchWithoutId = deduplicatedBatch.map((item) => {
            const { id, ...itemWithoutId } = item;
            return itemWithoutId;
          });

          const { data, error } = await supabase
            .from("equivalences")
            .upsert(batchWithoutId, {
              onConflict: "product_code,equivalent_code",
              ignoreDuplicates: false,
            })
            .select();

          if (error) {
            console.error("Erro no UPSERT por códigos:", error);
            errors.push(
              `Lote ${Math.floor(i / batchSize) + 1}: ${error.message}`
            );
            continue;
          }

          // Contagem inteligente: detecta inserções, atualizações reais e equivalências sem mudança
          if (data) {
            for (const item of data) {
              const timeDiff = Math.abs(
                new Date(item.created_at).getTime() -
                  new Date(item.updated_at).getTime()
              );

              if (timeDiff < 1000) {
                // Equivalência nova: created_at ≈ updated_at
                insertedCount++;
              } else {
                // Equivalência existente foi processada
                // Com o novo trigger: updated_at só muda se houve alteração real nos códigos
                // Vamos verificar se updated_at foi alterado recentemente (últimos 5 segundos)
                const now = new Date().getTime();
                const updatedTime = new Date(item.updated_at).getTime();

                if (now - updatedTime < 5000) {
                  // updated_at foi alterado recentemente = atualização real
                  updatedCount++;
                } else {
                  // updated_at antigo = equivalência não foi realmente alterada
                  unchangedCount++;
                }
              }
            }
          }
        } else if (
          strategy === "upsert_by_id" &&
          deduplicatedBatch.some((eq) => eq.id)
        ) {
          // UPSERT por ID (apenas quando IDs são explicitamente fornecidos)
          const { data, error } = await supabase
            .from("equivalences")
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
            .from("equivalences")
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
        totalProcessed: validEquivalences.length,
        inserted: insertedCount,
        updated: updatedCount,
        unchanged: unchangedCount,
        errors: errors.length,
      },
      message: `Importação concluída: ${insertedCount} inseridas, ${updatedCount} atualizadas, ${unchangedCount} sem alterações`,
      errors: errors.slice(0, 10), // Limitar erros retornados
    });
  } catch (error) {
    console.error(
      "Erro na API de importação inteligente de equivalências:",
      error
    );
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
      auto: "Detecta automaticamente se deve usar ID ou códigos para UPSERT",
      upsert_by_id: "UPSERT baseado no campo ID (requer ID nos dados)",
      upsert_by_codes:
        "UPSERT baseado nos códigos product_code + equivalent_code",
      insert_only: "Apenas inserção (pode gerar duplicatas)",
    },
    recommendations: {
      "Com IDs conhecidos": "upsert_by_id",
      "Sem IDs, evitar duplicatas": "upsert_by_codes",
      "Dados novos garantidos": "insert_only",
      "Não sei qual usar": "auto",
    },
    conflict_resolution: {
      upsert_by_codes: "product_code,equivalent_code",
      upsert_by_id: "id",
    },
  });
}
