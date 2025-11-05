-- Script para verificar e criar a função get_user_dashboard_stats
-- Execute este script no seu Supabase SQL Editor

-- 1. Verificar se a função existe
SELECT proname as function_name, prosrc as source_code 
FROM pg_proc 
WHERE proname = 'get_user_dashboard_stats';

-- 2. Verificar se as tabelas necessárias existem
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('orders', 'order_items', 'products');

-- 3. Criar ou substituir a função
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

    -- Se não há produtos, usar data atual
    IF v_last_stock_update IS NULL THEN
        v_last_stock_update := NOW();
    END IF;

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

-- 4. Comentário para documentação
COMMENT ON FUNCTION get_user_dashboard_stats(UUID) IS 'Retorna estatísticas agregadas para o dashboard de um usuário específico, incluindo total de vendas, comissões, itens vendidos e a data da última atualização do estoque.';

-- 5. Testar a função (substitua pelo seu user_id real)
-- SELECT * FROM get_user_dashboard_stats('seu-user-id-aqui');