"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/modules/auth/presentation/providers/auth.provider";
import { MonthSelector } from "@/presentation/components/dashboard/MonthSelector";
import { Header } from "@/presentation/components/layout/Header";
import {
  SelectedMonth,
  useDashboardStats,
} from "@/presentation/hooks/useDashboardStats";
import { SessionManager } from "@/shared/infrastructure/session/session-manager";
import { LoadingSpinner } from "@/shared/presentation/components/ui/loading-spinner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Clock,
  DollarSign,
  FileText,
  Package,
  Search,
  ShoppingCart,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [selectedMonth, setSelectedMonth] = useState<SelectedMonth | null>(
    null
  );
  const { data: stats, isLoading, error } = useDashboardStats(selectedMonth);

  useEffect(() => {
    // Verifica se o usuário está autenticado
    const isAuthenticated = SessionManager.isAuthenticated();

    if (!loading && !isAuthenticated) {
      router.push("/login");
      return;
    }

    // Verifica se o usuário precisa trocar a senha
    const mustChangePassword = document.cookie.includes(
      "must_change_password=true"
    );
    if (!loading && mustChangePassword) {
      router.push("/change-password");
      return;
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Se não estiver autenticado, não renderiza nada
  if (!SessionManager.isAuthenticated()) {
    return null;
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return "Data indisponível";
    }
  };

  if (error) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <div className="flex-1 mt-[48px]">
          <main className="container mx-auto p-4">
            <Card>
              <CardContent className="p-6">
                <div className="text-center text-red-600">
                  <p>Erro ao carregar estatísticas do dashboard</p>
                  <Button
                    className="mt-4"
                    onClick={() => window.location.reload()}
                  >
                    Tentar novamente
                  </Button>
                </div>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <div className="flex-1 mt-[48px]">
        <main className="container mx-auto p-4">
          <div className="container mx-auto px-4 py-6 space-y-6 max-w-7xl">
            {/* Header do Dashboard */}
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">
                Dashboard de Vendas 📊
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base">
                Resumo das suas vendas e estatísticas
              </p>
            </div>

            {/* Seletor de Mês */}
            <MonthSelector
              selectedMonth={selectedMonth}
              onMonthChange={setSelectedMonth}
            />

            {/* Cards de Estatísticas */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {/* Card 1: Total de Vendas */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total de Vendas
                  </CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-8 w-full" />
                  ) : (
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(stats?.totalSales || 0)}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Card 2: Total de Comissões */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total de Comissões
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-8 w-full" />
                  ) : (
                    <div className="text-2xl font-bold text-blue-600">
                      {formatCurrency(stats?.totalCommissions || 0)}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Card 3: Itens Vendidos */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Itens Vendidos
                  </CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-8 w-full" />
                  ) : (
                    <div className="text-2xl font-bold text-purple-600">
                      {stats?.totalItemsSold || 0}
                      <span className="text-sm text-muted-foreground font-normal ml-1">
                        unidades
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Card 4: Última Atualização */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Última Atualização
                  </CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-8 w-full" />
                  ) : (
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-orange-600">
                        Estoque
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(
                          stats?.lastStockUpdate || new Date().toISOString()
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Seção de Ações Rápidas */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Ações Rápidas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <Button asChild variant="outline" className="h-auto p-4 justify-start">
                    <Link href="/orders/new">
                      <div className="flex items-center gap-3">
                        <ShoppingCart className="h-5 w-5" />
                        <div className="text-left">
                          <div className="font-medium">Nova Venda</div>
                          <div className="text-sm text-muted-foreground">
                            Criar um novo pedido
                          </div>
                        </div>
                      </div>
                    </Link>
                  </Button>

                  <Button
                    asChild
                    variant="outline"
                    className="h-auto p-4 justify-start"
                  >
                    <Link href="/products">
                      <div className="flex items-center gap-3">
                        <Search className="h-5 w-5" />
                        <div className="text-left">
                          <div className="font-medium">Ver Produtos</div>
                          <div className="text-sm text-muted-foreground">
                            Consultar estoque
                          </div>
                        </div>
                      </div>
                    </Link>
                  </Button>

                  <Button
                    asChild
                    variant="outline"
                    className="h-auto p-4 justify-start"
                  >
                    <Link href="/orders">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5" />
                        <div className="text-left">
                          <div className="font-medium">Relatórios</div>
                          <div className="text-sm text-muted-foreground">
                            Ver histórico de vendas
                          </div>
                        </div>
                      </div>
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Seção de Resumo Rápido */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Resumo Rápido
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Status das Vendas</h4>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {isLoading ? (
                          <Skeleton className="h-4 w-16" />
                        ) : stats?.totalSales ? (
                          "Ativo"
                        ) : (
                          "Nenhuma venda"
                        )}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Sistema</h4>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-green-600">
                        Online
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
