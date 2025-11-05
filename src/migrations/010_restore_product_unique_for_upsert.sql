-- Migração 010: Restaurar índice único no campo product para UPSERT correto
-- Data: 2024-12-31
-- Descrição: O usuário quer UPSERT por nome do produto, não permitir duplicatas por referência

-- 1. Primeiro, remover duplicatas existentes (manter o mais recente)
DELETE FROM products p1
WHERE EXISTS (
  SELECT 1 FROM products p2 
  WHERE p2.product = p1.product 
  AND p2.id > p1.id
);

-- 2. Recriar índice único no campo product
CREATE UNIQUE INDEX IF NOT EXISTS products_product_unique_idx ON products(product);

-- 3. Comentário atualizado
COMMENT ON INDEX products_product_unique_idx IS 'Índice único para nome do produto - evita duplicatas por referência';

-- 4. Analisar a tabela
ANALYZE products; 