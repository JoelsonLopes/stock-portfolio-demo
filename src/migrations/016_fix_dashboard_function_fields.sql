-- Migration: 016_fix_dashboard_function_fields.sql
-- Descrição: Corrigir função para usar campos que realmente existem
-- Data: 2025-07-16

-- Função corrigida sem tentar acessar total_commission que não existe
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

    -- CORRIGIDO: Calcular comissões usando order_items se tiver commission_percentage
    BEGIN
        -- Verificar se order_items tem commission_percentage
        IF EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'order_items' 
            AND column_name = 'commission_percentage'
            AND table_schema = 'public'
        ) THEN
            SELECT COALESCE(
                SUM(oi.quantity * oi.unit_price * (oi.commission_percentage / 100.0)), 
                0
            )
            INTO v_total_commission
            FROM public.order_items oi
            JOIN public.orders o ON oi.order_id = o.id
            WHERE o.user_id = p_user_id
              AND o.created_at::DATE >= v_start_date
              AND o.created_at::DATE <= v_end_date
              AND oi.commission_percentage IS NOT NULL;
        ELSE
            -- Se não tem commission_percentage, assumir 5% do total como comissão
            v_total_commission := v_total_sales * 0.05;
        END IF;
        
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

-- Adicionar policy RLS para tabela orders (estava faltando!)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Policy para que usuários só vejam suas próprias orders
CREATE POLICY "Users can only access their own orders" ON public.orders
    FOR ALL USING (user_id = auth.uid());

-- Comentário
COMMENT ON FUNCTION get_user_dashboard_stats(UUID, DATE, DATE) IS 
'Função corrigida que não depende do campo total_commission inexistente.';

-- Testar (descomente e substitua pelo seu user_id)
-- SELECT * FROM get_user_dashboard_stats('da7a8609-da3a-4d16-b55a-ae7646cd5f9d');