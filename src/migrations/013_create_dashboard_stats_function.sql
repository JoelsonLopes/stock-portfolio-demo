-- Migration: 013_create_dashboard_stats_function.sql
-- Descrição: Criação da função para buscar estatísticas do dashboard de forma performática.
-- Data: 2025-07-09

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
BEGIN
    -- Obter a data da última atualização de qualquer produto (otimizado)
    SELECT MAX(updated_at)
    INTO v_last_stock_update
    FROM public.products;

    -- Retornar as estatísticas do usuário e a data de atualização do estoque
    RETURN QUERY
    SELECT
        COALESCE(SUM(o.total), 0) AS "totalSales",
        COALESCE(SUM(o.commission), 0) AS "totalCommissions",
        (
            SELECT COALESCE(SUM(oi.quantity), 0)
            FROM public.order_items oi
            WHERE oi.order_id IN (SELECT id FROM public.orders WHERE user_id = p_user_id)
        )::BIGINT AS "totalItemsSold",
        v_last_stock_update AS "lastStockUpdate"
    FROM
        public.orders o
    WHERE
        o.user_id = p_user_id;
END;
$$;

-- Comentários para documentação
COMMENT ON FUNCTION get_user_dashboard_stats(UUID) IS 'Retorna estatísticas agregadas para o dashboard de um usuário específico, incluindo total de vendas, comissões, itens vendidos e a data da última atualização do estoque.';