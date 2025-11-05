-- Migration: 011_optimize_equivalences_table_for_upsert.sql
-- Descrição: Otimização da tabela equivalences para operações UPSERT
-- Data: 2025-01-15
-- Objetivo: Preparar tabela equivalences para importação inteligente com UPSERT

-- ==========================================
-- OTIMIZAÇÕES PARA TABELA EQUIVALENCES
-- ==========================================

-- 1. Garantir que o índice único existe para UPSERT
-- Este índice é fundamental para a estratégia upsert_by_codes
CREATE UNIQUE INDEX IF NOT EXISTS equivalences_codes_unique_idx 
ON public.equivalences (product_code, equivalent_code);

-- 2. Índice para performance em buscas por product_code
CREATE INDEX IF NOT EXISTS idx_equivalences_product_code_optimized
ON public.equivalences USING btree (product_code)
INCLUDE (equivalent_code, id, created_at, updated_at);

-- 3. Índice para performance em buscas por equivalent_code  
CREATE INDEX IF NOT EXISTS idx_equivalences_equivalent_code_optimized
ON public.equivalences USING btree (equivalent_code)
INCLUDE (product_code, id, created_at, updated_at);

-- 4. Índice para ordenação otimizada (usado em listagens)
CREATE INDEX IF NOT EXISTS idx_equivalences_created_at_desc
ON public.equivalences (created_at DESC, id DESC);

-- ==========================================
-- CONSTRAINTS DE VALIDAÇÃO
-- ==========================================

-- 5. Garantir que product_code não é vazio
ALTER TABLE public.equivalences 
ADD CONSTRAINT IF NOT EXISTS equivalences_product_code_not_empty 
CHECK (length(trim(product_code)) > 0);

-- 6. Garantir que equivalent_code não é vazio
ALTER TABLE public.equivalences 
ADD CONSTRAINT IF NOT EXISTS equivalences_equivalent_code_not_empty 
CHECK (length(trim(equivalent_code)) > 0);

-- 7. Garantir que os códigos são diferentes (não pode ser equivalente de si mesmo)
ALTER TABLE public.equivalences 
ADD CONSTRAINT IF NOT EXISTS equivalences_codes_different 
CHECK (product_code != equivalent_code);

-- 8. Limitar tamanho dos códigos para evitar problemas de performance
ALTER TABLE public.equivalences 
ADD CONSTRAINT IF NOT EXISTS equivalences_product_code_length 
CHECK (length(product_code) <= 255);

ALTER TABLE public.equivalences 
ADD CONSTRAINT IF NOT EXISTS equivalences_equivalent_code_length 
CHECK (length(equivalent_code) <= 255);

-- ==========================================
-- TRIGGER PARA UPDATED_AT AUTOMÁTICO
-- ==========================================

-- 9. Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_equivalences_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 10. Trigger para updated_at em updates
DROP TRIGGER IF EXISTS update_equivalences_updated_at ON public.equivalences;
CREATE TRIGGER update_equivalences_updated_at 
  BEFORE UPDATE ON public.equivalences 
  FOR EACH ROW EXECUTE FUNCTION update_equivalences_updated_at_column();

-- ==========================================
-- OTIMIZAÇÕES DE VACUUM E ANALYZE
-- ==========================================

-- 11. Configurar autovacuum otimizado para equivalences
ALTER TABLE public.equivalences SET (
  autovacuum_vacuum_scale_factor = 0.1,
  autovacuum_analyze_scale_factor = 0.05,
  autovacuum_vacuum_cost_delay = 10,
  autovacuum_vacuum_cost_limit = 1000
);

-- 12. Atualizar estatísticas da tabela
ANALYZE public.equivalences;

-- ==========================================
-- COMENTÁRIOS EXPLICATIVOS
-- ==========================================

COMMENT ON INDEX equivalences_codes_unique_idx IS 
'Índice único para UPSERT por product_code + equivalent_code na API smart-import';

COMMENT ON INDEX idx_equivalences_product_code_optimized IS 
'Índice otimizado para buscas por product_code com campos incluídos';

COMMENT ON INDEX idx_equivalences_equivalent_code_optimized IS 
'Índice otimizado para buscas por equivalent_code com campos incluídos';

COMMENT ON INDEX idx_equivalences_created_at_desc IS 
'Índice para ordenação por data de criação (mais recentes primeiro)';

COMMENT ON CONSTRAINT equivalences_product_code_not_empty ON public.equivalences IS 
'Garante que product_code não é vazio após trim';

COMMENT ON CONSTRAINT equivalences_equivalent_code_not_empty ON public.equivalences IS 
'Garante que equivalent_code não é vazio após trim';

COMMENT ON CONSTRAINT equivalences_codes_different ON public.equivalences IS 
'Garante que um produto não pode ser equivalente de si mesmo';

-- ==========================================
-- VERIFICAÇÃO DOS RESULTADOS
-- ==========================================

-- Query para verificar se os índices foram criados
-- SELECT indexname, indexdef 
-- FROM pg_indexes 
-- WHERE tablename = 'equivalences' 
-- AND schemaname = 'public'
-- ORDER BY indexname;

-- Query para verificar constraints
-- SELECT conname, consrc 
-- FROM pg_constraint 
-- WHERE conrelid = 'public.equivalences'::regclass 
-- AND contype = 'c'
-- ORDER BY conname;

-- ==========================================
-- TESTE DE PERFORMANCE UPSERT
-- ==========================================

-- Exemplo de UPSERT que deve ser otimizado após esta migration:
/*
INSERT INTO public.equivalences (product_code, equivalent_code, created_at, updated_at)
VALUES 
  ('TEST001', 'ALT001', NOW(), NOW()),
  ('TEST002', 'ALT002', NOW(), NOW())
ON CONFLICT (product_code, equivalent_code) 
DO UPDATE SET 
  updated_at = EXCLUDED.updated_at;
*/

-- ==========================================
-- ROLLBACK (se necessário)
-- ==========================================

-- Para reverter esta migration:
/*
DROP TRIGGER IF EXISTS update_equivalences_updated_at ON public.equivalences;
DROP FUNCTION IF EXISTS update_equivalences_updated_at_column();

ALTER TABLE public.equivalences DROP CONSTRAINT IF EXISTS equivalences_product_code_not_empty;
ALTER TABLE public.equivalences DROP CONSTRAINT IF EXISTS equivalences_equivalent_code_not_empty;
ALTER TABLE public.equivalences DROP CONSTRAINT IF EXISTS equivalences_codes_different;
ALTER TABLE public.equivalences DROP CONSTRAINT IF EXISTS equivalences_product_code_length;
ALTER TABLE public.equivalences DROP CONSTRAINT IF EXISTS equivalences_equivalent_code_length;

DROP INDEX IF EXISTS equivalences_codes_unique_idx;
DROP INDEX IF EXISTS idx_equivalences_product_code_optimized;
DROP INDEX IF EXISTS idx_equivalences_equivalent_code_optimized;
DROP INDEX IF EXISTS idx_equivalences_created_at_desc;
*/ 