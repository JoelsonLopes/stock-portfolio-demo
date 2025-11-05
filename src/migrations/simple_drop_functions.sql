-- Script simplificado para remover funções duplicadas
-- Execute este script no painel do Supabase (SQL Editor)

-- 1. REMOVER TODAS AS VERSÕES POSSÍVEIS (sem DEFAULT na assinatura)
DROP FUNCTION IF EXISTS get_user_dashboard_stats() CASCADE;
DROP FUNCTION IF EXISTS get_user_dashboard_stats(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_user_dashboard_stats(UUID, DATE) CASCADE;
DROP FUNCTION IF EXISTS get_user_dashboard_stats(UUID, DATE, DATE) CASCADE;

-- 2. REMOVER get_user_available_months
DROP FUNCTION IF EXISTS get_user_available_months() CASCADE;
DROP FUNCTION IF EXISTS get_user_available_months(UUID) CASCADE;

-- 3. REMOVER get_custom_user_id
DROP FUNCTION IF EXISTS get_custom_user_id() CASCADE;

-- 4. RECRIAR FUNÇÃO DE MAPEAMENTO DE USUÁRIO
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

-- 5. RECRIAR FUNÇÃO DE DASHBOARD STATS
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

    -- Calcular comissão como 5% do total
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

-- 6. RECRIAR FUNÇÃO DE MESES DISPONÍVEIS
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
        TO_CHAR(month_date, 'MM') AS "month",
        EXTRACT(YEAR FROM month_date)::INTEGER AS "year",
        TO_CHAR(month_date, 'YYYY-MM') AS "monthYear",
        COUNT(order_id) > 0 AS "hasData"
    FROM (
        SELECT
            DATE_TRUNC('month', o.created_at) AS month_date,
            o.id AS order_id
        FROM public.orders o
        WHERE o.user_id = v_user_id
    ) AS monthly_orders
    GROUP BY month_date
    ORDER BY month_date DESC;
END;
$$;
