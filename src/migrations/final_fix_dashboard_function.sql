-- Script FINAL para corrigir a função get_user_dashboard_stats
-- O campo correto é total_commission, não commission
-- Execute este script no seu Supabase SQL Editor

-- Função corrigida com o campo correto de comissão
CREATE OR REPLACE FUNCTION get_user_dashboard_stats(p_user_id UUID)
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
BEGIN
    -- Obter a data da última atualização de qualquer produto
    SELECT MAX(updated_at)
    INTO v_last_stock_update
    FROM public.products;

    -- Se não há produtos, usar data atual
    IF v_last_stock_update IS NULL THEN
        v_last_stock_update := NOW();
    END IF;

    -- Calcular total de vendas
    SELECT COALESCE(SUM(o.total), 0)
    INTO v_total_sales
    FROM public.orders o
    WHERE o.user_id = p_user_id;

    -- Calcular total de comissões usando o campo correto total_commission
    SELECT COALESCE(SUM(o.total_commission), 0)
    INTO v_total_commission
    FROM public.orders o
    WHERE o.user_id = p_user_id;

    -- Calcular total de itens vendidos
    SELECT COALESCE(SUM(oi.quantity), 0)
    INTO v_total_items
    FROM public.order_items oi
    JOIN public.orders o ON oi.order_id = o.id
    WHERE o.user_id = p_user_id;

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
COMMENT ON FUNCTION get_user_dashboard_stats(UUID) IS 'Retorna estatísticas agregadas para o dashboard de um usuário específico usando o campo correto total_commission.';

-- Testar a função com seu user_id
SELECT * FROM get_user_dashboard_stats('da7a8609-da3a-4d16-b55a-ae7646cd5f9d');