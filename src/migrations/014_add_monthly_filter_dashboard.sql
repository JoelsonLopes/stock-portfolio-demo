-- Migration: 014_add_monthly_filter_dashboard.sql
-- Descrição: Adiciona filtro por mês na função de estatísticas do dashboard
-- Data: 2025-07-16

-- Função atualizada com filtro por mês
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
    -- Se não foram fornecidas datas, usar o mês atual
    IF p_start_date IS NULL OR p_end_date IS NULL THEN
        v_start_date := DATE_TRUNC('month', CURRENT_DATE)::DATE;
        v_end_date := (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE;
    ELSE
        v_start_date := p_start_date;
        v_end_date := p_end_date;
    END IF;

    -- Obter a data da última atualização de qualquer produto
    SELECT MAX(updated_at)
    INTO v_last_stock_update
    FROM public.products;

    -- Se não há produtos, usar data atual
    IF v_last_stock_update IS NULL THEN
        v_last_stock_update := NOW();
    END IF;

    -- Calcular total de vendas no período
    SELECT COALESCE(SUM(o.total), 0)
    INTO v_total_sales
    FROM public.orders o
    WHERE o.user_id = p_user_id
      AND o.created_at::DATE >= v_start_date
      AND o.created_at::DATE <= v_end_date;

    -- Calcular total de comissões no período
    SELECT COALESCE(SUM(o.total_commission), 0)
    INTO v_total_commission
    FROM public.orders o
    WHERE o.user_id = p_user_id
      AND o.created_at::DATE >= v_start_date
      AND o.created_at::DATE <= v_end_date;

    -- Calcular total de itens vendidos no período
    SELECT COALESCE(SUM(oi.quantity), 0)
    INTO v_total_items
    FROM public.order_items oi
    JOIN public.orders o ON oi.order_id = o.id
    WHERE o.user_id = p_user_id
      AND o.created_at::DATE >= v_start_date
      AND o.created_at::DATE <= v_end_date;

    -- Retornar os resultados
    RETURN QUERY
    SELECT
        v_total_sales AS "totalSales",
        v_total_commission AS "totalCommissions",
        v_total_items AS "totalItemsSold",
        v_last_stock_update AS "lastStockUpdate";
END;
$$;

-- Comentário atualizado
COMMENT ON FUNCTION get_user_dashboard_stats(UUID, DATE, DATE) IS 
'Retorna estatísticas agregadas para o dashboard de um usuário específico com filtro por período. 
Se não informado período, retorna dados do mês atual.';

-- Função auxiliar para listar meses disponíveis para o usuário
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

COMMENT ON FUNCTION get_user_available_months(UUID) IS 
'Retorna lista de meses que têm dados de vendas para um usuário específico.';

-- Teste das funções (substitua pelo seu user_id real)
-- SELECT * FROM get_user_dashboard_stats('da7a8609-da3a-4d16-b55a-ae7646cd5f9d');
-- SELECT * FROM get_user_dashboard_stats('da7a8609-da3a-4d16-b55a-ae7646cd5f9d', '2024-07-01', '2024-07-31');
-- SELECT * FROM get_user_available_months('da7a8609-da3a-4d16-b55a-ae7646cd5f9d');