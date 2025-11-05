-- Script para debuggar problemas com funções RPC
-- Execute este script no Supabase SQL Editor

-- 1. Verificar se as funções existem
SELECT
    p.proname as function_name,
    n.nspname as schema_name,
    pg_get_function_identity_arguments(p.oid) as arguments,
    p.prosecdef as security_definer
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname IN ('get_user_dashboard_stats', 'get_user_available_months')
ORDER BY p.proname;

-- ABAIXO O RESULTADO DESSE SCRIPT
[
  {
    "function_name": "get_user_available_months",
    "schema_name": "public",
    "arguments": "p_user_id uuid",
    "security_definer": true
  },
  {
    "function_name": "get_user_dashboard_stats",
    "schema_name": "public",
    "arguments": "p_user_id uuid, p_start_date date, p_end_date date",
    "security_definer": true
  },
  {
    "function_name": "get_user_dashboard_stats",
    "schema_name": "public",
    "arguments": "p_user_id uuid",
    "security_definer": true
  }
]

-- 2. Verificar permissões das funções
SELECT
    schemaname,
    tablename,
    tableowner,
    hasinserts,
    hasselects,
    hasupdates,
    hasdeletes
FROM pg_tables
WHERE tablename IN ('orders', 'order_items', 'products')
ORDER BY tablename;
-- RESULTADO DO SCRIPT
ERROR:  42703: column "hasinserts" does not exist
LINE 5:     hasinserts,
            ^
HINT:  Perhaps you meant to reference the column "pg_tables.hasindexes".
Note: A limit of 100 was applied to your query. If this was the cause of a syntax error, try selecting "No limit" instead and re-run the query.

-- 3. Testar função dashboard manualmente (substitua pelo seu user_id)
SELECT 'Testando get_user_dashboard_stats...' as test;
-- SELECT * FROM get_user_dashboard_stats('da7a8609-da3a-4d16-b55a-ae7646cd5f9d');

-- 4. Testar função available months manualmente
SELECT 'Testando get_user_available_months...' as test;
-- SELECT * FROM get_user_available_months('da7a8609-da3a-4d16-b55a-ae7646cd5f9d');

-- 5. Verificar se há dados de orders para o usuário
SELECT 'Verificando dados na tabela orders...' as test;
-- SELECT COUNT(*) as total_orders FROM orders WHERE user_id = 'da7a8609-da3a-4d16-b55a-ae7646cd5f9d';

-- 6. Verificar estrutura das tabelas necessárias
SELECT 'Verificando estrutura da tabela orders...' as test;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'orders' AND table_schema = 'public'
ORDER BY ordinal_position;
-- RESULTADO DO SCRIPT
[
  {
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "column_name": "order_number",
    "data_type": "character varying",
    "is_nullable": "NO"
  },
  {
    "column_name": "user_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "column_name": "client_id",
    "data_type": "bigint",
    "is_nullable": "NO"
  },
  {
    "column_name": "payment_condition_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "column_name": "status",
    "data_type": "USER-DEFINED",
    "is_nullable": "NO"
  },
  {
    "column_name": "subtotal",
    "data_type": "numeric",
    "is_nullable": "NO"
  },
  {
    "column_name": "total_discount",
    "data_type": "numeric",
    "is_nullable": "NO"
  },
  {
    "column_name": "total",
    "data_type": "numeric",
    "is_nullable": "NO"
  },
  {
    "column_name": "notes",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "column_name": "shipping_rate",
    "data_type": "numeric",
    "is_nullable": "NO"
  }
]

-- 7. Verificar se há policies RLS que podem estar bloqueando
SELECT 'Verificando policies RLS...' as test;
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename IN ('orders', 'order_items', 'products')
ORDER BY tablename, policyname;
-- RESULTADO DO SCRIPT
[
  {
    "schemaname": "public",
    "tablename": "order_items",
    "policyname": "Users can only access items from their own orders",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "(EXISTS ( SELECT 1\n   FROM orders\n  WHERE ((orders.id = order_items.order_id) AND (orders.user_id = auth.uid()))))"
  },
  {
    "schemaname": "public",
    "tablename": "products",
    "policyname": "Usuários autenticados podem atualizar produtos",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "UPDATE",
    "qual": "is_authenticated()"
  },
  {
    "schemaname": "public",
    "tablename": "products",
    "policyname": "Usuários autenticados podem deletar produtos",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "DELETE",
    "qual": "true"
  },
  {
    "schemaname": "public",
    "tablename": "products",
    "policyname": "Usuários autenticados podem inserir produtos",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "INSERT",
    "qual": null
  },
  {
    "schemaname": "public",
    "tablename": "products",
    "policyname": "Usuários autenticados podem ver todos os produtos",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "SELECT",
    "qual": "true"
  }
]

-- 8. Verificar se as funções têm a sintaxe correta
SELECT 'Verificando definição das funções...' as test;
SELECT
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname IN ('get_user_dashboard_stats', 'get_user_available_months')
ORDER BY p.proname;
-- RESULTADO DO SCRIPT
[
  {
    "function_name": "get_user_available_months",
    "function_definition": "CREATE OR REPLACE FUNCTION public.get_user_available_months(p_user_id uuid)\n RETURNS TABLE(month text, year integer, \"monthYear\" text, \"hasData\" boolean)\n LANGUAGE plpgsql\n SECURITY DEFINER\nAS $function$\r\nBEGIN\r\n    RETURN QUERY\r\n    SELECT \r\n        TO_CHAR(DATE_TRUNC('month', o.created_at), 'MM') AS \"month\",\r\n        EXTRACT(YEAR FROM o.created_at)::INTEGER AS \"year\",\r\n        TO_CHAR(DATE_TRUNC('month', o.created_at), 'YYYY-MM') AS \"monthYear\",\r\n        COUNT(o.id) > 0 AS \"hasData\"\r\n    FROM public.orders o\r\n    WHERE o.user_id = p_user_id\r\n    GROUP BY DATE_TRUNC('month', o.created_at)\r\n    ORDER BY DATE_TRUNC('month', o.created_at) DESC;\r\nEND;\r\n$function$\n"
  },
  {
    "function_name": "get_user_dashboard_stats",
    "function_definition": "CREATE OR REPLACE FUNCTION public.get_user_dashboard_stats(p_user_id uuid, p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date)\n RETURNS TABLE(\"totalSales\" numeric, \"totalCommissions\" numeric, \"totalItemsSold\" bigint, \"lastStockUpdate\" timestamp with time zone)\n LANGUAGE plpgsql\n SECURITY DEFINER\nAS $function$\r\nDECLARE\r\n    v_last_stock_update TIMESTAMP WITH TIME ZONE;\r\n    v_total_sales NUMERIC := 0;\r\n    v_total_commission NUMERIC := 0;\r\n    v_total_items BIGINT := 0;\r\n    v_start_date DATE;\r\n    v_end_date DATE;\r\nBEGIN\r\n    -- Se não foram fornecidas datas, usar o mês atual\r\n    IF p_start_date IS NULL OR p_end_date IS NULL THEN\r\n        v_start_date := DATE_TRUNC('month', CURRENT_DATE)::DATE;\r\n        v_end_date := (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE;\r\n    ELSE\r\n        v_start_date := p_start_date;\r\n        v_end_date := p_end_date;\r\n    END IF;\r\n\r\n    -- Obter a data da última atualização de qualquer produto\r\n    SELECT MAX(updated_at)\r\n    INTO v_last_stock_update\r\n    FROM public.products;\r\n\r\n    -- Se não há produtos, usar data atual\r\n    IF v_last_stock_update IS NULL THEN\r\n        v_last_stock_update := NOW();\r\n    END IF;\r\n\r\n    -- Calcular total de vendas no período\r\n    SELECT COALESCE(SUM(o.total), 0)\r\n    INTO v_total_sales\r\n    FROM public.orders o\r\n    WHERE o.user_id = p_user_id\r\n      AND o.created_at::DATE >= v_start_date\r\n      AND o.created_at::DATE <= v_end_date;\r\n\r\n    -- Calcular total de comissões no período\r\n    SELECT COALESCE(SUM(o.total_commission), 0)\r\n    INTO v_total_commission\r\n    FROM public.orders o\r\n    WHERE o.user_id = p_user_id\r\n      AND o.created_at::DATE >= v_start_date\r\n      AND o.created_at::DATE <= v_end_date;\r\n\r\n    -- Calcular total de itens vendidos no período\r\n    SELECT COALESCE(SUM(oi.quantity), 0)\r\n    INTO v_total_items\r\n    FROM public.order_items oi\r\n    JOIN public.orders o ON oi.order_id = o.id\r\n    WHERE o.user_id = p_user_id\r\n      AND o.created_at::DATE >= v_start_date\r\n      AND o.created_at::DATE <= v_end_date;\r\n\r\n    -- Retornar os resultados\r\n    RETURN QUERY\r\n    SELECT\r\n        v_total_sales AS \"totalSales\",\r\n        v_total_commission AS \"totalCommissions\",\r\n        v_total_items AS \"totalItemsSold\",\r\n        v_last_stock_update AS \"lastStockUpdate\";\r\nEND;\r\n$function$\n"
  },
  {
    "function_name": "get_user_dashboard_stats",
    "function_definition": "CREATE OR REPLACE FUNCTION public.get_user_dashboard_stats(p_user_id uuid)\n RETURNS TABLE(\"totalSales\" numeric, \"totalCommissions\" numeric, \"totalItemsSold\" bigint, \"lastStockUpdate\" timestamp with time zone)\n LANGUAGE plpgsql\n SECURITY DEFINER\nAS $function$\r\nDECLARE\r\n    v_last_stock_update TIMESTAMP WITH TIME ZONE;\r\n    v_total_sales NUMERIC := 0;\r\n    v_total_commission NUMERIC := 0;\r\n    v_total_items BIGINT := 0;\r\nBEGIN\r\n    -- Obter a data da última atualização de qualquer produto\r\n    SELECT MAX(updated_at)\r\n    INTO v_last_stock_update\r\n    FROM public.products;\r\n\r\n    -- Se não há produtos, usar data atual\r\n    IF v_last_stock_update IS NULL THEN\r\n        v_last_stock_update := NOW();\r\n    END IF;\r\n\r\n    -- Calcular total de vendas\r\n    SELECT COALESCE(SUM(o.total), 0)\r\n    INTO v_total_sales\r\n    FROM public.orders o\r\n    WHERE o.user_id = p_user_id;\r\n\r\n    -- Calcular total de itens vendidos\r\n    SELECT COALESCE(SUM(oi.quantity), 0)\r\n    INTO v_total_items\r\n    FROM public.order_items oi\r\n    JOIN public.orders o ON oi.order_id = o.id\r\n    WHERE o.user_id = p_user_id;\r\n\r\n    -- TEMPORÁRIO: Calcular comissão dos order_items se o campo existir\r\n    BEGIN\r\n        -- Tentar calcular comissão pelos itens (se commission_percentage existir)\r\n        SELECT COALESCE(\r\n            SUM(oi.quantity * oi.unit_price * (oi.commission_percentage / 100.0)), \r\n            0\r\n        )\r\n        INTO v_total_commission\r\n        FROM public.order_items oi\r\n        JOIN public.orders o ON oi.order_id = o.id\r\n        WHERE o.user_id = p_user_id\r\n        AND oi.commission_percentage IS NOT NULL;\r\n    EXCEPTION\r\n        WHEN OTHERS THEN\r\n            v_total_commission := 0;\r\n    END;\r\n\r\n    -- Retornar os resultados\r\n    RETURN QUERY\r\n    SELECT\r\n        v_total_sales AS \"totalSales\",\r\n        v_total_commission AS \"totalCommissions\",\r\n        v_total_items AS \"totalItemsSold\",\r\n        v_last_stock_update AS \"lastStockUpdate\";\r\nEND;\r\n$function$\n"
  }
]
