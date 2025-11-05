-- Migration: 015_simple_dashboard_functions.sql
-- Descrição: Versão simplificada das funções para debug
-- Data: 2025-07-16

-- Versão super simples da função dashboard para teste
CREATE OR REPLACE FUNCTION get_user_dashboard_stats_simple(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Retornar JSON simples para teste
    RETURN json_build_object(
        'totalSales', 1000,
        'totalCommissions', 100,
        'totalItemsSold', 10,
        'lastStockUpdate', NOW()
    );
END;
$$;
-- RESULTADO SCRIPT
ERROR:  42P13: cannot change return type of existing function
HINT:  Use DROP FUNCTION get_user_dashboard_stats_simple(uuid) first.

-- Função original modificada com mais logs e tratamento de erro
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
    -- Log de entrada
    RAISE NOTICE 'Iniciando get_user_dashboard_stats para user_id: %, start_date: %, end_date: %',
                 p_user_id, p_start_date, p_end_date;

    -- Se não foram fornecidas datas, usar o mês atual
    IF p_start_date IS NULL OR p_end_date IS NULL THEN
        v_start_date := DATE_TRUNC('month', CURRENT_DATE)::DATE;
        v_end_date := (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE;
        RAISE NOTICE 'Usando datas padrão: % até %', v_start_date, v_end_date;
    ELSE
        v_start_date := p_start_date;
        v_end_date := p_end_date;
    END IF;

    -- Verificar se o usuário existe
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
        RAISE NOTICE 'Usuário não encontrado: %', p_user_id;
        -- Mesmo assim, continuar para retornar zeros
    END IF;

    -- Obter a data da última atualização de qualquer produto
    BEGIN
        SELECT MAX(updated_at)
        INTO v_last_stock_update
        FROM public.products;

        RAISE NOTICE 'Última atualização de produtos: %', v_last_stock_update;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Erro ao buscar atualização de produtos: %', SQLERRM;
        v_last_stock_update := NOW();
    END;

    -- Se não há produtos, usar data atual
    IF v_last_stock_update IS NULL THEN
        v_last_stock_update := NOW();
    END IF;

    -- Calcular total de vendas no período
    BEGIN
        SELECT COALESCE(SUM(o.total), 0)
        INTO v_total_sales
        FROM public.orders o
        WHERE o.user_id = p_user_id
          AND o.created_at::DATE >= v_start_date
          AND o.created_at::DATE <= v_end_date;

        RAISE NOTICE 'Total de vendas calculado: %', v_total_sales;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Erro ao calcular vendas: %', SQLERRM;
        v_total_sales := 0;
    END;

    -- Calcular total de comissões no período
    BEGIN
        SELECT COALESCE(SUM(o.total_commission), 0)
        INTO v_total_commission
        FROM public.orders o
        WHERE o.user_id = p_user_id
          AND o.created_at::DATE >= v_start_date
          AND o.created_at::DATE <= v_end_date;

        RAISE NOTICE 'Total de comissões calculado: %', v_total_commission;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Erro ao calcular comissões: %', SQLERRM;
        v_total_commission := 0;
    END;

    -- Calcular total de itens vendidos no período
    BEGIN
        SELECT COALESCE(SUM(oi.quantity), 0)
        INTO v_total_items
        FROM public.order_items oi
        JOIN public.orders o ON oi.order_id = o.id
        WHERE o.user_id = p_user_id
          AND o.created_at::DATE >= v_start_date
          AND o.created_at::DATE <= v_end_date;

        RAISE NOTICE 'Total de itens calculado: %', v_total_items;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Erro ao calcular itens: %', SQLERRM;
        v_total_items := 0;
    END;

    -- Retornar os resultados
    RAISE NOTICE 'Retornando: vendas=%, comissões=%, itens=%, update=%',
                 v_total_sales, v_total_commission, v_total_items, v_last_stock_update;

    RETURN QUERY
    SELECT
        v_total_sales AS "totalSales",
        v_total_commission AS "totalCommissions",
        v_total_items AS "totalItemsSold",
        v_last_stock_update AS "lastStockUpdate";
END;
$$;

-- Função simplified para available months
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
    RAISE NOTICE 'Iniciando get_user_available_months para user_id: %', p_user_id;

    -- Verificar se há dados de orders para o usuário
    IF NOT EXISTS (SELECT 1 FROM public.orders WHERE user_id = p_user_id) THEN
        RAISE NOTICE 'Nenhuma order encontrada para o usuário: %', p_user_id;
        -- Retornar vazio mas sem erro
        RETURN;
    END IF;

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

    RAISE NOTICE 'Função get_user_available_months concluída com sucesso';
END;
$$;

-- Testar as funções (descomente e substitua pelo seu user_id)
-- SELECT * FROM get_user_dashboard_stats_simple('da7a8609-da3a-4d16-b55a-ae7646cd5f9d');
-- SELECT * FROM get_user_dashboard_stats('da7a8609-da3a-4d16-b55a-ae7646cd5f9d');
-- SELECT * FROM get_user_available_months('da7a8609-da3a-4d16-b55a-ae7646cd5f9d');
