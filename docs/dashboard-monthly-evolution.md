# Dashboard Mensal - Evolução para Opção 2

## 📋 **Status Atual (Opção 1)**

### ✅ **Implementado**
- **Função SQL**: `get_user_dashboard_stats()` com filtro por mês
- **Hook**: `useDashboardStats(selectedMonth)` com parâmetros de data
- **Componente**: `MonthSelector` com seletor de mês
- **Interface**: Dashboard com filtro mensal integrado

### 🔧 **Como Funciona**
```typescript
// Hook usage
const [selectedMonth, setSelectedMonth] = useState<SelectedMonth | null>(null)
const { data: stats } = useDashboardStats(selectedMonth)

// Estrutura do SelectedMonth
{
  startDate: "2024-07-01",
  endDate: "2024-07-31", 
  label: "Julho 2024"
}
```

### 📊 **Função SQL**
```sql
-- Filtro por período (mês atual se não especificado)
SELECT * FROM get_user_dashboard_stats(
  'user-id',
  '2024-07-01',  -- start_date
  '2024-07-31'   -- end_date
)
```

## 🚀 **Próximos Passos (Opção 2)**

### 1️⃣ **Tabela de Snapshots Mensais**
```sql
CREATE TABLE monthly_dashboard_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  month_year TEXT NOT NULL, -- '2024-07'
  snapshot_date DATE NOT NULL,
  total_sales NUMERIC NOT NULL DEFAULT 0,
  total_commissions NUMERIC NOT NULL DEFAULT 0,
  total_items_sold BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, month_year)
);
```

### 2️⃣ **Função de Geração de Snapshot**
```sql
CREATE OR REPLACE FUNCTION generate_monthly_snapshot(
  p_user_id UUID,
  p_target_month TEXT -- '2024-07'
) RETURNS VOID AS $$
BEGIN
  INSERT INTO monthly_dashboard_snapshots 
  (user_id, month_year, snapshot_date, total_sales, total_commissions, total_items_sold)
  VALUES (
    p_user_id,
    p_target_month,
    CURRENT_DATE,
    -- Calcular dados do mês específico
    (SELECT dados atuais da função existente)
  )
  ON CONFLICT (user_id, month_year) 
  DO UPDATE SET 
    total_sales = EXCLUDED.total_sales,
    total_commissions = EXCLUDED.total_commissions,
    total_items_sold = EXCLUDED.total_items_sold,
    updated_at = NOW();
END;
$$;
```

### 3️⃣ **Job Automático (Cron)**
```sql
-- Executar todo dia 1 para gerar snapshot do mês anterior
SELECT cron.schedule('monthly-snapshot', '0 2 1 * *', 
  'SELECT generate_monthly_snapshot(user_id, to_char(current_date - interval ''1 month'', ''YYYY-MM'')) FROM users;'
);
```

### 4️⃣ **Hook Híbrido**
```typescript
export function useDashboardStats(selectedMonth?: SelectedMonth | null) {
  const isCurrentMonth = selectedMonth?.startDate.startsWith(getCurrentMonth())
  
  // Se é mês atual, usar dados em tempo real
  if (isCurrentMonth) {
    return useQuery({
      queryKey: ['dashboard-stats-live', user?.id],
      queryFn: () => getLiveStats(user.id)
    })
  }
  
  // Se é mês passado, usar snapshot
  return useQuery({
    queryKey: ['dashboard-stats-snapshot', user?.id, selectedMonth],
    queryFn: () => getSnapshotStats(user.id, selectedMonth)
  })
}
```

## 🎯 **Benefícios da Migração**

### **Performance**
- ✅ Consultas mais rápidas para meses antigos
- ✅ Menos carga no banco para dados históricos
- ✅ Cache otimizado para snapshots

### **Confiabilidade**
- ✅ Dados históricos preservados mesmo com exclusões
- ✅ Consistência temporal dos relatórios
- ✅ Backup automático de estatísticas

### **Recursos Avançados**
- ✅ Comparação entre meses
- ✅ Tendências históricas
- ✅ Relatórios anuais automáticos

## 📅 **Cronograma de Migração**

### **Fase 1: Preparação** (1-2 dias)
- [ ] Criar tabela de snapshots
- [ ] Implementar função de geração
- [ ] Testar com dados históricos

### **Fase 2: Transição** (1 dia)
- [ ] Modificar hook para mode híbrido
- [ ] Implementar fallback para dados em tempo real
- [ ] Testar compatibilidade

### **Fase 3: Automação** (1 dia)
- [ ] Configurar job automático
- [ ] Implementar monitoramento
- [ ] Documentar processo

## 🔧 **Arquivos para Modificar**

### **Banco de Dados**
- `src/migrations/015_create_monthly_snapshots.sql`
- `src/migrations/016_setup_monthly_cron.sql`

### **Frontend**
- `src/presentation/hooks/useDashboardStats.ts` (modo híbrido)
- `src/presentation/hooks/useMonthlySnapshots.ts` (novo)

### **Componentes**
- `src/presentation/components/dashboard/MonthSelector.tsx` (comparação)
- `src/presentation/components/dashboard/MonthComparison.tsx` (novo)

## 📊 **Métricas de Sucesso**

- **Performance**: Redução de 50%+ no tempo de resposta
- **Storage**: Tamanho previsível de snapshots
- **UX**: Comparação visual entre meses
- **Confiabilidade**: 99.9% de dados históricos preservados

---

**Nota**: Esta evolução mantém 100% de compatibilidade com o código atual, permitindo migração gradual sem interrupções.