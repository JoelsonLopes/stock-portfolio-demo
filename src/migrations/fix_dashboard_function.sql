-- Script para corrigir a função get_user_dashboard_stats
-- Execute este script no seu Supabase SQL Editor

-- 1. Verificar estrutura da tabela orders
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'orders' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Verificar estrutura da tabela order_items
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'order_items' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Função corrigida que funciona com campos existentes
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
        -- Usar total_commission se existir, senão calcular como 0
        COALESCE(SUM(
            CASE 
                WHEN EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'orders' 
                    AND column_name = 'commission'
                    AND table_schema = 'public'
                ) THEN o.commission
                WHEN EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'orders' 
                    AND column_name = 'total_commission'
                    AND table_schema = 'public'
                ) THEN o.total_commission
                ELSE 0
            END
        ), 0) AS "totalCommissions",
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

-- 4. Versão alternativa mais simples que sempre funciona
CREATE OR REPLACE FUNCTION get_user_dashboard_stats_simple(p_user_id UUID)
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

    -- Calcular total de itens vendidos
    SELECT COALESCE(SUM(oi.quantity), 0)
    INTO v_total_items
    FROM public.order_items oi
    JOIN public.orders o ON oi.order_id = o.id
    WHERE o.user_id = p_user_id;

    -- Por enquanto, comissão será 0 até descobrirmos o campo correto
    v_total_commission := 0;

    -- Retornar os resultados
    RETURN QUERY
    SELECT
        v_total_sales AS "totalSales",
        v_total_commission AS "totalCommissions",
        v_total_items AS "totalItemsSold",
        v_last_stock_update AS "lastStockUpdate";
END;
$$;

-- 5. Usar a função simples como padrão
DROP FUNCTION IF EXISTS get_user_dashboard_stats(UUID);
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

    -- Calcular total de vendas (com tratamento de erro)
    BEGIN
        SELECT COALESCE(SUM(o.total), 0)
        INTO v_total_sales
        FROM public.orders o
        WHERE o.user_id = p_user_id;
    EXCEPTION
        WHEN OTHERS THEN
            v_total_sales := 0;
    END;

    -- Calcular total de itens vendidos (com tratamento de erro)
    BEGIN
        SELECT COALESCE(SUM(oi.quantity), 0)
        INTO v_total_items
        FROM public.order_items oi
        JOIN public.orders o ON oi.order_id = o.id
        WHERE o.user_id = p_user_id;
    EXCEPTION
        WHEN OTHERS THEN
            v_total_items := 0;
    END;

    -- Por enquanto, comissão será 0 até descobrirmos o campo correto
    v_total_commission := 0;

    -- Retornar os resultados
    RETURN QUERY
    SELECT
        v_total_sales AS "totalSales",
        v_total_commission AS "totalCommissions",
        v_total_items AS "totalItemsSold",
        v_last_stock_update AS "lastStockUpdate";
END;
$$;

-- 6. Comentário atualizado
COMMENT ON FUNCTION get_user_dashboard_stats(UUID) IS 'Retorna estatísticas agregadas para o dashboard de um usuário específico - versão corrigida que funciona com a estrutura atual da tabela orders.';

-- 7. Testar a função (substitua pelo seu user_id real)
SELECT * FROM get_user_dashboard_stats('da7a8609-da3a-4d16-b55a-ae7646cd5f9d');