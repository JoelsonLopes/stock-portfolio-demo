"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/presentation/components/ui/select";
import { useAvailableMonths } from "@/presentation/hooks/useAvailableMonths";
import { SelectedMonth } from "@/presentation/hooks/useDashboardStats";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar } from "lucide-react";
import { useEffect, useState } from "react";

// Função para capitalizar a primeira letra do mês
const capitalizeMonth = (dateString: string): string => {
  return dateString.charAt(0).toUpperCase() + dateString.slice(1);
};

interface MonthSelectorProps {
  selectedMonth: SelectedMonth | null;
  onMonthChange: (month: SelectedMonth | null) => void;
}

// Função para gerar meses dos últimos 12 meses
const generateRecentMonths = (): SelectedMonth[] => {
  const months: SelectedMonth[] = [];
  const currentDate = new Date();

  for (let i = 0; i < 12; i++) {
    const date = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() - i,
      1
    );
    const year = date.getFullYear();
    const month = date.getMonth();

    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0); // Último dia do mês

    months.push({
      startDate: startDate.toISOString().split("T")[0],
      endDate: endDate.toISOString().split("T")[0],
      label: capitalizeMonth(format(date, "MMMM yyyy", { locale: ptBR })),
    });
  }

  return months;
};

export function MonthSelector({
  selectedMonth,
  onMonthChange,
}: MonthSelectorProps) {
  const { data: availableMonths, isLoading } = useAvailableMonths();
  const [recentMonths] = useState(generateRecentMonths());

  // Função para obter o mês atual como padrão
  const getCurrentMonth = (): SelectedMonth => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);

    return {
      startDate: startDate.toISOString().split("T")[0],
      endDate: endDate.toISOString().split("T")[0],
      label: capitalizeMonth(format(now, "MMMM yyyy", { locale: ptBR })),
    };
  };

  // Inicializar com mês atual se não há seleção
  useEffect(() => {
    if (!selectedMonth) {
      onMonthChange(getCurrentMonth());
    }
  }, [selectedMonth, onMonthChange]);

  // Verificar se um mês tem dados
  const hasData = (monthYear: string) => {
    return availableMonths?.some((am) => am.monthYear === monthYear) || false;
  };

  // Função para resetar para mês atual
  const resetToCurrentMonth = () => {
    onMonthChange(getCurrentMonth());
  };

  const handleMonthChange = (value: string) => {
    if (value === "current") {
      resetToCurrentMonth();
      return;
    }

    const month = recentMonths.find(
      (m) => m.startDate.substring(0, 7) === value // Compara YYYY-MM
    );

    if (month) {
      onMonthChange(month);
    }
  };

  const currentValue = selectedMonth
    ? selectedMonth.startDate.substring(0, 7)
    : getCurrentMonth().startDate.substring(0, 7);

  return (
    <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-gray-800">Período de Análise</h3>
          </div>

          <div className="flex items-center gap-3 flex-1">
            <Select value={currentValue} onValueChange={handleMonthChange}>
              <SelectTrigger className="w-full sm:w-[200px] bg-white border-blue-200">
                <SelectValue placeholder="Selecionar mês" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current">
                  <div className="flex items-center gap-2">
                    <span>Mês Atual</span>
                    <Badge variant="default" className="text-xs">
                      Padrão
                    </Badge>
                  </div>
                </SelectItem>
                {recentMonths.map((month) => {
                  const monthYear = month.startDate.substring(0, 7);
                  const monthHasData = hasData(monthYear);

                  return (
                    <SelectItem key={monthYear} value={monthYear}>
                      <div className="flex items-center gap-2">
                        <span
                          className={
                            monthHasData ? "text-gray-900" : "text-gray-400"
                          }
                        >
                          {month.label}
                        </span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            {selectedMonth && (
              <Button
                variant="outline"
                size="sm"
                onClick={resetToCurrentMonth}
                className="text-blue-600 border-blue-200 hover:bg-blue-50"
              >
                Voltar ao Atual
              </Button>
            )}
          </div>

          <div className="text-sm text-gray-600">
            {selectedMonth ? (
              <span className="font-medium">{selectedMonth.label}</span>
            ) : (
              <span className="text-gray-400">Carregando...</span>
            )}
          </div>
        </div>

        {isLoading && (
          <div className="mt-2 text-xs text-gray-500">
            Carregando meses disponíveis...
          </div>
        )}
      </CardContent>
    </Card>
  );
}
