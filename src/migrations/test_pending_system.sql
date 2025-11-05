-- Script de teste para o sistema de pendências
-- Execute este script após rodar a migration 020

-- 1. Verificar se as colunas foram criadas corretamente
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'order_items' 
AND column_name IN ('pending_quantity', 'has_pending');

SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND column_name = 'has_pending_items';

-- 2. Verificar se os índices foram criados
SELECT 
    indexname, 
    indexdef
FROM pg_indexes 
WHERE tablename = 'order_items' 
AND indexname LIKE '%pending%';

SELECT 
    indexname, 
    indexdef
FROM pg_indexes 
WHERE tablename = 'orders' 
AND indexname LIKE '%pending%';

-- 3. Verificar se a função existe
SELECT 
    p.proname as function_name,
    pg_get_function_result(p.oid) as return_type,
    pg_get_function_arguments(p.oid) as arguments
FROM pg_proc p
WHERE p.proname = 'update_order_pending_status';

-- 4. Verificar se o trigger existe
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_update_order_pending_status';

-- 5. Teste prático - Simular adição de item com pendência
-- (Apenas exemplo - não executar em produção sem cuidado)
/*
-- Exemplo de como seria um item com pendência:
INSERT INTO order_items (
    order_id, 
    product_id, 
    quantity, 
    pending_quantity, 
    has_pending,
    unit_price, 
    original_unit_price, 
    discount_percentage, 
    discount_amount, 
    total_price, 
    commission_percentage
) VALUES (
    'uuid-do-pedido',
    123,
    5,    -- quantidade efetiva (disponível em estoque)
    3,    -- quantidade pendente (faltou estoque)
    true, -- tem pendência
    10.00,
    10.00,
    0,
    0,
    50.00, -- total baseado na quantidade efetiva (5 x 10.00)
    0
);
*/