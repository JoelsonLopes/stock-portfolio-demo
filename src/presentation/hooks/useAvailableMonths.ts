import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/modules/auth/presentation/providers/auth.provider";
import { useQuery } from "@tanstack/react-query";
import { AvailableMonth } from "./useDashboardStats";

// Instância única do Supabase client
const supabase = createClient();

export function useAvailableMonths() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["available-months", user?.id],
    queryFn: async (): Promise<AvailableMonth[]> => {
      if (!user?.id) {
        console.warn("Usuário não autenticado - retornando array vazio");
        return [];
      }

      try {
        const { data, error } = (await supabase.rpc(
          "get_user_available_months",
          {
            p_user_id: user.id,
          },
        )) as { data: AvailableMonth[] | null; error: any };

        if (error) {
          console.error("Erro ao buscar meses disponíveis:", error);

          // Se a função não existir ou houver erro de permissão, retornar array vazio
          if (
            error?.code === "PGRST204" ||
            error?.message?.includes("function") ||
            error?.message?.includes("does not exist") ||
            error?.code === "42883" || // função não encontrada
            error?.code === "PGRST116" // schema não encontrado
          ) {
            console.warn(
              "Função get_user_available_months não encontrada ou sem permissão",
            );
            return [];
          }

          // Para outros erros, também retornar array vazio para não quebrar a interface
          return [];
        }

        return data || [];
      } catch (error) {
        console.error("Erro na busca de meses disponíveis:", error);
        return [];
      }
    },
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000, // 10 minutos
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      return failureCount < 2; // Máximo 2 tentativas
    },
  });
}
