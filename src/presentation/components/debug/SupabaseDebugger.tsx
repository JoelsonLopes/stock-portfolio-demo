"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/modules/auth/presentation/providers/auth.provider";
import { useSupabaseTest } from "@/presentation/hooks/useSupabaseTest";

export function SupabaseDebugger() {
  const { user } = useAuth();
  const { data, isLoading, error, refetch } = useSupabaseTest();

  return (
    <Card className="bg-yellow-50 border-yellow-200">
      <CardHeader>
        <CardTitle className="text-yellow-800">🔧 Debug Supabase</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <strong>User ID:</strong>
            <br />
            <code className="text-xs bg-gray-100 p-1 rounded">
              {user?.id || "null"}
            </code>
          </div>
          <div>
            <strong>Status:</strong>
            <br />
            <Badge
              variant={
                isLoading ? "secondary" : error ? "destructive" : "default"
              }
            >
              {isLoading ? "Testando..." : error ? "Erro" : "Completo"}
            </Badge>
          </div>
        </div>

        <div className="space-y-2">
          <Button
            onClick={() => refetch()}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? "Executando Testes..." : "Executar Testes"}
          </Button>

          <div className="text-sm text-gray-600">
            <strong>Instruções:</strong>
            <ol className="list-decimal ml-4 mt-1">
              <li>Clique no botão acima</li>
              <li>Abra o Console do navegador (F12)</li>
              <li>Veja os logs detalhados</li>
              <li>Copie e cole os logs para análise</li>
            </ol>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 p-3 rounded border border-red-200">
            <strong className="text-red-800">Erro:</strong>
            <pre className="text-xs text-red-700 mt-1 overflow-x-auto">
              {JSON.stringify(error, null, 2)}
            </pre>
          </div>
        )}

        {data && (
          <div className="bg-green-50 p-3 rounded border border-green-200">
            <strong className="text-green-800">Resultado:</strong>
            <pre className="text-xs text-green-700 mt-1 overflow-x-auto">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
