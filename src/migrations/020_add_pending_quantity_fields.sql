-- Migration 020: Adicionar campos de pendência nas tabelas de pedidos
-- Criado: 2025-01-25
-- Descrição: Implementa sistema de pendências quando quantidade solicitada é maior que estoque

-- 1. Adicionar campos na tabela order_items
ALTER TABLE order_items 
ADD COLUMN pending_quantity NUMERIC DEFAULT 0,
ADD COLUMN has_pending BOOLEAN DEFAULT FALSE;

-- 2. Adicionar campo na tabela orders
ALTER TABLE orders 
ADD COLUMN has_pending_items BOOLEAN DEFAULT FALSE;

-- 3. Comentários para documentação
COMMENT ON COLUMN order_items.pending_quantity IS 'Quantidade pendente quando a quantidade solicitada excede o estoque disponível';
COMMENT ON COLUMN order_items.has_pending IS 'Flag indicando se este item do pedido possui pendência';
COMMENT ON COLUMN orders.has_pending_items IS 'Flag indicando se o pedido possui itens com pendência';

-- 4. Índices para performance
CREATE INDEX idx_order_items_has_pending ON order_items(has_pending) WHERE has_pending = TRUE;
CREATE INDEX idx_orders_has_pending_items ON orders(has_pending_items) WHERE has_pending_items = TRUE;

-- 5. Função para atualizar status de pendência do pedido
CREATE OR REPLACE FUNCTION update_order_pending_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Atualizar o campo has_pending_items do pedido baseado nos itens
    UPDATE orders 
    SET has_pending_items = (
        SELECT COUNT(*) > 0 
        FROM order_items 
        WHERE order_id = COALESCE(NEW.order_id, OLD.order_id) 
        AND has_pending = TRUE
    )
    WHERE id = COALESCE(NEW.order_id, OLD.order_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 6. Trigger para manter sincronização automática
DROP TRIGGER IF EXISTS trigger_update_order_pending_status ON order_items;
CREATE TRIGGER trigger_update_order_pending_status
    AFTER INSERT OR UPDATE OR DELETE ON order_items
    FOR EACH ROW
    EXECUTE FUNCTION update_order_pending_status();

-- 7. Atualizar pedidos existentes (zerar pendências inicialmente)
UPDATE order_items SET pending_quantity = 0, has_pending = FALSE WHERE pending_quantity IS NULL;
UPDATE orders SET has_pending_items = FALSE WHERE has_pending_items IS NULL;