-- Migração 008: Otimização da tabela products para UPSERT performático
-- Data: 2024-12-31
-- Descrição: Adiciona índices e constraints para melhorar performance de importação

-- 1. Adicionar índice único no campo product para UPSERT por nome
-- (Apenas se não existir)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'products' 
        AND indexname = 'products_product_unique_idx'
    ) THEN
        CREATE UNIQUE INDEX products_product_unique_idx ON products(product);
    END IF;
END $$;

-- 2. Adicionar índices compostos para consultas comuns
-- Índice para busca por produto + aplicação
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'products' 
        AND indexname = 'products_product_application_idx'
    ) THEN
        CREATE INDEX products_product_application_idx ON products(product, application);
    END IF;
END $$;

-- 3. Índice para consultas por preço (para relatórios)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'products' 
        AND indexname = 'products_price_idx'
    ) THEN
        CREATE INDEX products_price_idx ON products(price);
    END IF;
END $$;

-- 4. Índice para consultas por estoque
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'products' 
        AND indexname = 'products_stock_idx'
    ) THEN
        CREATE INDEX products_stock_idx ON products(stock);
    END IF;
END $$;

-- 5. Índice para consultas por data de atualização (para auditoria)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'products' 
        AND indexname = 'products_updated_at_idx'
    ) THEN
        CREATE INDEX products_updated_at_idx ON products(updated_at DESC);
    END IF;
END $$;

-- 6. Função para trigger de updated_at automático
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 7. Trigger para atualizar updated_at automaticamente
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 8. Adicionar constraint para validar preços positivos
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'products_price_positive'
    ) THEN
        ALTER TABLE products ADD CONSTRAINT products_price_positive CHECK (price >= 0);
    END IF;
END $$;

-- 9. Adicionar constraint para validar estoque não negativo
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'products_stock_non_negative'
    ) THEN
        ALTER TABLE products ADD CONSTRAINT products_stock_non_negative CHECK (stock >= 0);
    END IF;
END $$;

-- 10. Adicionar constraint para nome de produto não vazio
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'products_product_not_empty'
    ) THEN
        ALTER TABLE products ADD CONSTRAINT products_product_not_empty CHECK (LENGTH(TRIM(product)) > 0);
    END IF;
END $$;

-- 11. Função para estatísticas de importação
CREATE OR REPLACE FUNCTION get_products_import_stats()
RETURNS TABLE (
    total_products BIGINT,
    avg_price NUMERIC,
    total_stock BIGINT,
    products_with_application BIGINT,
    last_update TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT,
        AVG(p.price)::NUMERIC(10,2),
        SUM(p.stock)::BIGINT,
        COUNT(CASE WHEN p.application IS NOT NULL AND LENGTH(TRIM(p.application)) > 0 THEN 1 END)::BIGINT,
        MAX(p.updated_at)
    FROM products p;
END;
$$ LANGUAGE plpgsql;

-- 12. View para produtos duplicados (útil para limpeza)
CREATE OR REPLACE VIEW products_duplicates AS
SELECT 
    product,
    COUNT(*) as duplicate_count,
    ARRAY_AGG(id ORDER BY created_at) as product_ids,
    MIN(created_at) as first_created,
    MAX(updated_at) as last_updated
FROM products 
GROUP BY product 
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC;

-- 13. Comentários para documentação
COMMENT ON INDEX products_product_unique_idx IS 'Índice único para nome do produto - usado para UPSERT por nome';
COMMENT ON INDEX products_product_application_idx IS 'Índice composto para buscas por produto e aplicação';
COMMENT ON FUNCTION update_updated_at_column() IS 'Função para atualizar automaticamente o campo updated_at';
COMMENT ON FUNCTION get_products_import_stats() IS 'Função para obter estatísticas da tabela de produtos';
COMMENT ON VIEW products_duplicates IS 'View para identificar produtos duplicados por nome';

-- 14. Analisar a tabela para otimizar o planner
ANALYZE products; 