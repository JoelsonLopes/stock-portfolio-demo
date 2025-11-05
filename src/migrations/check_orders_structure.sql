-- Script para verificar a estrutura REAL da tabela orders
-- Execute este script no seu Supabase SQL Editor

-- 1. Verificar todas as colunas da tabela orders
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'orders' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Verificar um exemplo de pedido real para ver os campos
SELECT *
FROM public.orders
WHERE user_id = 'da7a8609-da3a-4d16-b55a-ae7646cd5f9d'
LIMIT 1;

-- 3. Verificar se há campos relacionados a comissão
SELECT column_name
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND table_schema = 'public'
AND column_name ILIKE '%commission%';

-- 4. Verificar se há campos relacionados a total
SELECT column_name
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND table_schema = 'public'
AND column_name ILIKE '%total%';

-- 5. Verificar se a comissão está na tabela order_items
SELECT column_name, data_type
FROM information_schema.columns 
WHERE table_name = 'order_items' AND table_schema = 'public'
AND column_name ILIKE '%commission%';

-- 6. Ver exemplo de order_items
SELECT *
FROM public.order_items oi
JOIN public.orders o ON oi.order_id = o.id
WHERE o.user_id = 'da7a8609-da3a-4d16-b55a-ae7646cd5f9d'
LIMIT 3;