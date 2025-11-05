# 🗄️ Migrações SQL - Dashboard por Mês + Login Duplo

## 📋 **Visão Geral**

Este documento detalha todas as migrações SQL necessárias para implementar o **Dashboard por Mês** e o **Sistema de Login Duplo**.

---

## 📂 **Lista de Migrações**

### **Ordem de Execução**
```sql
-- 1. Primeira implementação (pode ter conflitos)
014_add_monthly_filter_dashboard.sql

-- 2. Limpeza de conflitos (OBRIGATÓRIA)
018_clean_duplicate_functions.sql

-- 3. Implementação final (OBRIGATÓRIA)
019_setup_supabase_auth_integration.sql
```

---

## 🚀 **Migração 014: Primeira Implementação**

### **Arquivo:** `src/migrations/014_add_monthly_filter_dashboard.sql`

**Status:** ⚠️ Obsoleta (causava conflitos)

**O que fazia:**
- Criou primeira versão da função com filtro por mês
- Adicionou função auxiliar para meses disponíveis
- Base para desenvolvimento

**Problemas encontrados:**
- Múltiplas versões da mesma função
- Conflito de parâmetros
- Dependência de campo inexistente (`total_commission`)

**Ação recomendada:** Não executar diretamente, usar versões posteriores.

---

## 🧹 **Migração 018: Limpeza de Conflitos**

### **Arquivo:** `src/migrations/018_clean_duplicate_functions.sql`

**Status:** ✅ Obrigatória

### **Código Completo**
```sql
-- Migration: 018_clean_duplicate_functions.sql
-- Descrição: Limpar funções duplicadas e criar versão única
-- Data: 2025-07-16

-- Remover TODAS as versões das funções para evitar conflitos
DROP FUNCTION IF EXISTS get_user_dashboard_stats(UUID);
DROP FUNCTION IF EXISTS get_user_dashboard_stats(UUID, DATE, DATE);
DROP FUNCTION IF EXISTS get_user_available_months(UUID);
DROP FUNCTION IF EXISTS get_user_dashboard_stats_simple(UUID);

-- Criar versão única da função dashboard
CREATE OR REPLACE FUNCTION get_user_dashboard_stats(
    p_user_id UUID,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
    "totalSales" NUMERIC,
    "totalCommissions" NUMERIC,
    "totalItemsSold" BIGINT,
    "lastStockUpdate" TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_last_stock_update TIMESTAMP WITH TIME ZONE;
    v_total_sales NUMERIC := 0;
    v_total_commission NUMERIC := 0;
    v_total_items BIGINT := 0;
    v_start_date DATE;
    v_end_date DATE;
BEGIN
    RAISE NOTICE 'Dashboard Stats - user_id: %, start_date: %, end_date: %', 
                 p_user_id, p_start_date, p_end_date;

    -- Se não foram fornecidas datas, usar o mês atual
    IF p_start_date IS NULL OR p_end_date IS NULL THEN
        v_start_date := DATE_TRUNC('month', CURRENT_DATE)::DATE;
        v_end_date := (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE;
    ELSE
        v_start_date := p_start_date;
        v_end_date := p_end_date;
    END IF;

    -- Obter a data da última atualização de qualquer produto
    SELECT COALESCE(MAX(updated_at), NOW())
    INTO v_last_stock_update
    FROM public.products;

    -- Calcular total de vendas no período
    SELECT COALESCE(SUM(o.total), 0)
    INTO v_total_sales
    FROM public.orders o
    WHERE o.user_id = p_user_id
      AND o.created_at::DATE >= v_start_date
      AND o.created_at::DATE <= v_end_date;

    -- Calcular comissão como 5% do total (já que não temos campo commission)
    v_total_commission := v_total_sales * 0.05;

    -- Calcular total de itens vendidos no período
    SELECT COALESCE(SUM(oi.quantity), 0)
    INTO v_total_items
    FROM public.order_items oi
    JOIN public.orders o ON oi.order_id = o.id
    WHERE o.user_id = p_user_id
      AND o.created_at::DATE >= v_start_date
      AND o.created_at::DATE <= v_end_date;

    RAISE NOTICE 'Resultados: vendas=%, comissões=%, itens=%', 
                 v_total_sales, v_total_commission, v_total_items;

    RETURN QUERY
    SELECT
        v_total_sales AS "totalSales",
        v_total_commission AS "totalCommissions",
        v_total_items AS "totalItemsSold",
        v_last_stock_update AS "lastStockUpdate";
END;
$$;

-- Criar versão única da função months
CREATE OR REPLACE FUNCTION get_user_available_months(p_user_id UUID)
RETURNS TABLE (
    "month" TEXT,
    "year" INTEGER,
    "monthYear" TEXT,
    "hasData" BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RAISE NOTICE 'Available Months - user_id: %', p_user_id;

    RETURN QUERY
    SELECT 
        TO_CHAR(DATE_TRUNC('month', o.created_at), 'MM') AS "month",
        EXTRACT(YEAR FROM o.created_at)::INTEGER AS "year",
        TO_CHAR(DATE_TRUNC('month', o.created_at), 'YYYY-MM') AS "monthYear",
        COUNT(o.id) > 0 AS "hasData"
    FROM public.orders o
    WHERE o.user_id = p_user_id
    GROUP BY DATE_TRUNC('month', o.created_at)
    ORDER BY DATE_TRUNC('month', o.created_at) DESC;
END;
$$;
```

### **O que esta migração faz:**

1. **🧹 Limpeza Total**
   - Remove todas as versões conflitantes das funções
   - Elimina duplicatas que causavam erro "Could not choose best candidate"

2. **📊 Função Dashboard**
   - Versão única com parâmetros opcionais
   - Cálculo correto sem campo `total_commission`
   - Logs para debug

3. **📅 Função Meses Disponíveis**
   - Lista meses que têm dados
   - Ordenação cronológica reversa

---

## 🔗 **Migração 019: Integração Auth Duplo**

### **Arquivo:** `src/migrations/019_setup_supabase_auth_integration.sql`

**Status:** ✅ Obrigatória

### **Código Completo**
```sql
-- Migration: 019_setup_supabase_auth_integration.sql
-- Descrição: Configurar integração entre auth customizado e Supabase auth
-- Data: 2025-07-16

-- Criar função para mapear auth.uid() para user_id customizado
CREATE OR REPLACE FUNCTION get_custom_user_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    custom_user_id UUID;
BEGIN
    -- Tentar obter o user_id dos metadados do usuário do Supabase
    SELECT (auth.user() -> 'user_metadata' ->> 'user_id')::UUID
    INTO custom_user_id;
    
    -- Se não encontrar, usar o próprio auth.uid()
    IF custom_user_id IS NULL THEN
        custom_user_id := auth.uid();
    END IF;
    
    RETURN custom_user_id;
END;
$$;

-- Atualizar funções para usar o mapeamento correto
CREATE OR REPLACE FUNCTION get_user_dashboard_stats(
    p_user_id UUID DEFAULT NULL,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
    "totalSales" NUMERIC,
    "totalCommissions" NUMERIC,
    "totalItemsSold" BIGINT,
    "lastStockUpdate" TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_last_stock_update TIMESTAMP WITH TIME ZONE;
    v_total_sales NUMERIC := 0;
    v_total_commission NUMERIC := 0;
    v_total_items BIGINT := 0;
    v_start_date DATE;
    v_end_date DATE;
    v_user_id UUID;
BEGIN
    -- Se p_user_id for fornecido, usar ele; senão usar o mapeamento automático
    IF p_user_id IS NOT NULL THEN
        v_user_id := p_user_id;
    ELSE
        v_user_id := get_custom_user_id();
    END IF;
    
    RAISE NOTICE 'Dashboard Stats - resolved user_id: %, start_date: %, end_date: %', 
                 v_user_id, p_start_date, p_end_date;

    -- Se não foram fornecidas datas, usar o mês atual
    IF p_start_date IS NULL OR p_end_date IS NULL THEN
        v_start_date := DATE_TRUNC('month', CURRENT_DATE)::DATE;
        v_end_date := (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE;
    ELSE
        v_start_date := p_start_date;
        v_end_date := p_end_date;
    END IF;

    -- Obter a data da última atualização de qualquer produto
    SELECT COALESCE(MAX(updated_at), NOW())
    INTO v_last_stock_update
    FROM public.products;

    -- Calcular total de vendas no período
    SELECT COALESCE(SUM(o.total), 0)
    INTO v_total_sales
    FROM public.orders o
    WHERE o.user_id = v_user_id
      AND o.created_at::DATE >= v_start_date
      AND o.created_at::DATE <= v_end_date;

    -- Calcular comissão como 5% do total (já que não temos campo commission)
    v_total_commission := v_total_sales * 0.05;

    -- Calcular total de itens vendidos no período
    SELECT COALESCE(SUM(oi.quantity), 0)
    INTO v_total_items
    FROM public.order_items oi
    JOIN public.orders o ON oi.order_id = o.id
    WHERE o.user_id = v_user_id
      AND o.created_at::DATE >= v_start_date
      AND o.created_at::DATE <= v_end_date;

    RAISE NOTICE 'Resultados: vendas=%, comissões=%, itens=%', 
                 v_total_sales, v_total_commission, v_total_items;

    RETURN QUERY
    SELECT
        v_total_sales AS "totalSales",
        v_total_commission AS "totalCommissions",
        v_total_items AS "totalItemsSold",
        v_last_stock_update AS "lastStockUpdate";
END;
$$;

-- Atualizar função de meses disponíveis
CREATE OR REPLACE FUNCTION get_user_available_months(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
    "month" TEXT,
    "year" INTEGER,
    "monthYear" TEXT,
    "hasData" BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Se p_user_id for fornecido, usar ele; senão usar o mapeamento automático
    IF p_user_id IS NOT NULL THEN
        v_user_id := p_user_id;
    ELSE
        v_user_id := get_custom_user_id();
    END IF;
    
    RAISE NOTICE 'Available Months - resolved user_id: %', v_user_id;

    RETURN QUERY
    SELECT 
        TO_CHAR(DATE_TRUNC('month', o.created_at), 'MM') AS "month",
        EXTRACT(YEAR FROM o.created_at)::INTEGER AS "year",
        TO_CHAR(DATE_TRUNC('month', o.created_at), 'YYYY-MM') AS "monthYear",
        COUNT(o.id) > 0 AS "hasData"
    FROM public.orders o
    WHERE o.user_id = v_user_id
    GROUP BY DATE_TRUNC('month', o.created_at)
    ORDER BY DATE_TRUNC('month', o.created_at) DESC;
END;
$$;

-- Comentários
COMMENT ON FUNCTION get_custom_user_id() IS 
'Mapeia auth.uid() do Supabase para user_id customizado usando metadados.';

COMMENT ON FUNCTION get_user_dashboard_stats(UUID, DATE, DATE) IS 
'Função dashboard com integração auth customizado + Supabase auth.';
```

### **O que esta migração faz:**

1. **🔗 Função de Mapeamento**
   - `get_custom_user_id()`: Mapeia entre sistemas de auth
   - Usa metadados salvos no perfil do Supabase
   - Fallback para `auth.uid()` se não encontrar

2. **🔄 Parâmetros Opcionais**
   - Todas as funções aceitam `p_user_id` como opcional
   - Se NULL, usa mapeamento automático
   - Compatibilidade total com ambos os sistemas

3. **📊 Flexibilidade de Uso**
   - Funciona com login duplo ativo
   - Funciona com parâmetros explícitos
   - Suporte para diferentes cenários

---

## 🔄 **Scripts de Execução**

### **Para Supabase SQL Editor**

```sql
-- Execute na ordem exata:

-- 1. Limpeza (OBRIGATÓRIA)
\i src/migrations/018_clean_duplicate_functions.sql

-- 2. Integração Auth (OBRIGATÓRIA)  
\i src/migrations/019_setup_supabase_auth_integration.sql
```

### **Para psql (PostgreSQL)**

```bash
# Execute no terminal (dentro do projeto)
psql -h localhost -U postgres -d database_name

-- Dentro do psql:
\i src/migrations/018_clean_duplicate_functions.sql
\i src/migrations/019_setup_supabase_auth_integration.sql
```

---

## ✅ **Verificação Pós-Migração**

### **1. Verificar Funções Criadas**
```sql
-- Listar funções criadas
SELECT 
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname IN (
    'get_user_dashboard_stats', 
    'get_user_available_months',
    'get_custom_user_id'
)
ORDER BY p.proname;

-- Resultado esperado:
-- get_custom_user_id()
-- get_user_available_months(p_user_id uuid)  
-- get_user_dashboard_stats(p_user_id uuid, p_start_date date, p_end_date date)
```

### **2. Testar Funções**
```sql
-- Teste com parâmetro explícito
SELECT * FROM get_user_dashboard_stats('SEU_USER_ID_AQUI');

-- Teste sem parâmetro (se logado no Supabase)
SELECT * FROM get_user_dashboard_stats();

-- Teste meses disponíveis
SELECT * FROM get_user_available_months('SEU_USER_ID_AQUI');
```

### **3. Verificar Logs**
```sql
-- Os logs devem aparecer como NOTICE no console
-- Dashboard Stats - resolved user_id: xxx, start_date: xxx, end_date: xxx
-- Resultados: vendas=xxx, comissões=xxx, itens=xxx
```

---

## 🐛 **Troubleshooting**

### **Erro: "Function does not exist"**
```sql
-- Causa: Migração não executada
-- Solução: Re-executar migrações na ordem correta
\i src/migrations/018_clean_duplicate_functions.sql
\i src/migrations/019_setup_supabase_auth_integration.sql
```

### **Erro: "Could not choose best candidate"**
```sql
-- Causa: Funções duplicadas ainda existem
-- Solução: Executar limpeza manual
DROP FUNCTION IF EXISTS get_user_dashboard_stats(UUID);
DROP FUNCTION IF EXISTS get_user_dashboard_stats(UUID, DATE, DATE);
-- Depois re-executar migração 019
```

### **Dados sempre zeros**
```sql
-- Causa: user_id incorreto ou sem dados
-- Verificar: 
SELECT COUNT(*) FROM orders WHERE user_id = 'SEU_USER_ID';
-- Se > 0, problema no mapeamento
-- Se = 0, usuário realmente não tem dados
```

---

## 📊 **Performance**

### **Índices Recomendados**
```sql
-- Para otimizar performance (se não existirem)
CREATE INDEX IF NOT EXISTS idx_orders_user_created 
ON orders(user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id 
ON order_items(order_id);

CREATE INDEX IF NOT EXISTS idx_products_updated_at 
ON products(updated_at);
```

### **Análise de Performance**
```sql
-- Verificar plano de execução
EXPLAIN ANALYZE 
SELECT * FROM get_user_dashboard_stats('SEU_USER_ID');
```

---

## 📈 **Histórico de Versões**

| Versão | Data | Arquivo | Status |
|--------|------|---------|--------|
| 1.0 | 2024-07-09 | 014_add_monthly_filter_dashboard.sql | ⚠️ Obsoleta |
| 2.0 | 2024-07-16 | 018_clean_duplicate_functions.sql | ✅ Atual |
| 2.1 | 2024-07-16 | 019_setup_supabase_auth_integration.sql | ✅ Atual |

---

## 🔮 **Próximas Migrações**

### **Planejadas (Futuro)**

**020_add_monthly_snapshots.sql**
- Implementação da Opção 2 (snapshots mensais)
- Tabela para cache de dados históricos
- Job automático para geração de snapshots

**021_add_dashboard_indexes.sql**
- Índices específicos para performance
- Otimizações para consultas frequentes

---

## 📞 **Suporte para DBAs**

### **Informações Técnicas**
- **PostgreSQL Version**: 14+
- **Supabase Compatible**: ✅
- **RLS Required**: ❌ (opcional)
- **Extensions**: Nenhuma necessária

### **Backup Recomendado**
```bash
# Antes de executar migrações
pg_dump -h HOST -U USER -d DATABASE --schema-only > backup_schema.sql
pg_dump -h HOST -U USER -d DATABASE --data-only > backup_data.sql
```

### **Rollback (se necessário)**
```sql
-- Para reverter (use com cuidado!)
DROP FUNCTION IF EXISTS get_user_dashboard_stats(UUID, DATE, DATE);
DROP FUNCTION IF EXISTS get_user_available_months(UUID);
DROP FUNCTION IF EXISTS get_custom_user_id();

-- Depois restaurar backup se disponível
```

**Migrações implementadas em:** Julho 2024  
**Versão:** 2.1.0  
**Status:** ✅ Produção - Testado e aprovado