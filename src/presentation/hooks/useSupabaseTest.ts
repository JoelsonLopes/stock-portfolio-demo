import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/modules/auth/presentation/providers/auth.provider";

const supabase = createClient();

export function useSupabaseTest() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["supabase-test", user?.id],
    queryFn: async () => {
      console.log("🔍 Iniciando teste de conectividade...");

      // Teste 1: Verificar se consegue fazer uma query simples
      try {
        console.log("📡 Testando conexão básica...");
        const { data, error } = await supabase
          .from("products")
          .select("count")
          .limit(1);

        console.log("✅ Conexão básica:", { data, error });

        if (error) {
          console.error("❌ Erro na conexão básica:", error);
        }
      } catch (err) {
        console.error("❌ Erro crítico na conexão:", err);
      }

      // Teste 2: Verificar autenticação
      try {
        console.log("🔐 Testando autenticação...");
        const { data: authData, error: authError } =
          await supabase.auth.getUser();
        console.log("✅ Dados de auth:", {
          user: authData?.user?.id,
          error: authError,
          isAuthenticated: !!authData?.user,
        });
      } catch (err) {
        console.error("❌ Erro crítico na auth:", err);
      }

      // Teste 3: Testar função RPC super simples
      try {
        console.log("🔧 Testando RPC básico...");
        const { data: rpcData, error: rpcError } = await supabase.rpc(
          "get_user_dashboard_stats",
          {
            p_user_id: user?.id || "00000000-0000-0000-0000-000000000000",
          },
        );

        console.log("✅ RPC Test:", {
          data: rpcData,
          error: rpcError,
          errorCode: rpcError?.code,
          errorMessage: rpcError?.message,
          errorDetails: rpcError?.details,
        });
      } catch (err) {
        console.error("❌ Erro crítico no RPC:", err);
      }

      return {
        message: "Testes executados - verifique o console",
        userId: user?.id,
        timestamp: new Date().toISOString(),
      };
    },
    enabled: !!user?.id,
    retry: false,
    refetchOnWindowFocus: false,
  });
}
