-- Adicionar campo shipping_rate à tabela orders
ALTER TABLE orders 
ADD COLUMN shipping_rate NUMERIC DEFAULT 0 NOT NULL 
CHECK (shipping_rate >= 0);

COMMENT ON COLUMN orders.shipping_rate IS 'Taxa de frete aplicada ao pedido'; 