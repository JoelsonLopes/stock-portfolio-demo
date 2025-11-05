import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/modules/auth/presentation/providers/auth.provider";

export type DashboardStats = {
  totalSales: number;
  totalCommissions: number;
  totalItemsSold: number;
  lastStockUpdate: string;
};

// Tipo para representar um mês selecionado
export type SelectedMonth = {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  label: string; // Ex: "Julho 2024"
};

// Tipo para mês disponível retornado pela função SQL
export type AvailableMonth = {
  month: string;
  year: number;
  monthYear: string;
  hasData: boolean;
};

// Tipo para a resposta da função SQL do Supabase
type SupabaseStatsResponse = {
  totalSales: string | number;
  totalCommissions: string | number;
  totalItemsSold: string | number;
  lastStockUpdate: string;
};

// Instância única do Supabase client
const supabase = createClient();

export function useDashboardStats(selectedMonth?: SelectedMonth | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [
      "dashboard-stats",
      user?.id,
      selectedMonth?.startDate,
      selectedMonth?.endDate,
    ],
    queryFn: async (): Promise<DashboardStats> => {
      if (!user?.id) {
        throw new Error("Usuário não autenticado");
      }

      try {
        // Tentar chamar a função RPC
        const rpcParams: any = { p_user_id: user.id };

        // Adicionar parâmetros de data se fornecidos
        if (selectedMonth) {
          rpcParams.p_start_date = selectedMonth.startDate;
          rpcParams.p_end_date = selectedMonth.endDate;
        }

        const { data, error } = (await supabase
          .rpc("get_user_dashboard_stats", rpcParams)
          .single()) as { data: SupabaseStatsResponse | null; error: any };

        if (error) {
          console.error("Erro RPC completo:", {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint,
            error: error,
          });

          // Se a função não existir, retornar dados padrão
          if (
            error.code === "PGRST204" ||
            error.message?.includes("function") ||
            error.message?.includes("does not exist")
          ) {
            console.warn(
              "Função get_user_dashboard_stats não encontrada, usando dados padrão",
            );
            return {
              totalSales: 0,
              totalCommissions: 0,
              totalItemsSold: 0,
              lastStockUpdate: new Date().toISOString(),
            };
          }

          throw new Error(
            `Erro ao buscar estatísticas: ${error.message || JSON.stringify(error)}`,
          );
        }

        return {
          totalSales: Number(data?.totalSales) || 0,
          totalCommissions: Number(data?.totalCommissions) || 0,
          totalItemsSold: Number(data?.totalItemsSold) || 0,
          lastStockUpdate: data?.lastStockUpdate || new Date().toISOString(),
        };
      } catch (error) {
        console.error("Erro na busca de estatísticas:", {
          error,
          errorMessage:
            error instanceof Error ? error.message : "Erro desconhecido",
          userId: user.id,
          selectedMonth,
        });

        // Fallback: retornar dados padrão em caso de erro
        return {
          totalSales: 0,
          totalCommissions: 0,
          totalItemsSold: 0,
          lastStockUpdate: new Date().toISOString(),
        };
      }
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchOnWindowFocus: true,
    retry: 1, // Reduzir tentativas
  });
}
