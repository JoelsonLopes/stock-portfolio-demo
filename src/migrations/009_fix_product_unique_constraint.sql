-- Migração 009: Corrigir constraint unique no campo product
-- Data: 2024-12-31
-- Descrição: Remove índice único do campo product para permitir produtos com mesmo nome mas IDs diferentes

-- 1. Remover o índice único problemático
DROP INDEX IF EXISTS products_product_unique_idx;

-- 2. Criar índice normal (não único) para performance
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'products' 
        AND indexname = 'products_product_idx'
    ) THEN
        CREATE INDEX products_product_idx ON products(product);
    END IF;
END $$;

-- 3. Atualizar view de duplicados para ser mais útil (baseada em ID, não nome)
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

-- 4. Atualizar comentários
COMMENT ON INDEX products_product_idx IS 'Índice para nome do produto - usado para buscas rápidas (não único)';
COMMENT ON VIEW products_duplicates IS 'View para identificar produtos com mesmo nome (pode ser intencional se IDs diferentes)';

-- 5. Analisar a tabela para otimizar o planner
ANALYZE products; 