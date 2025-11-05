# Estratégia de Importação Inteligente - Produtos

## 📋 Visão Geral

Este documento descreve a implementação da **Importação Inteligente de Produtos**, um sistema avançado que automaticamente detecta se deve **inserir novos registros** ou **atualizar registros existentes** durante a importação de arquivos CSV/TXT.

## 🎯 Objetivos Alcançados

- ✅ **UPSERT Automático**: Insert ou Update automático baseado em critérios inteligentes
- ✅ **Performance Otimizada**: Processamento em lotes de 500-1000 registros
- ✅ **Zero Duplicatas**: Estratégias para evitar registros duplicados
- ✅ **Reutilizável**: Sistema modular para futuras necessidades
- ✅ **Escalável**: Preparado para tabelas com milhões de registros

## 🛠️ Componentes da Solução

### 1. API de Importação Inteligente
**Arquivo**: `app/api/products/smart-import/route.ts`

```typescript
// Endpoint principal
POST /api/products/smart-import

// Parâmetros
{
  "products": Array<ProductImportData>,
  "strategy": "auto" | "upsert_by_id" | "upsert_by_name" | "insert_only"
}

// Resposta
{
  "success": boolean,
  "strategy": string,
  "statistics": {
    "totalProcessed": number,
    "inserted": number,
    "updated": number,
    "errors": number
  },
  "message": string,
  "errors": Array<string>
}
```

### 2. Otimizações de Banco de Dados
**Arquivo**: `migrations/008_optimize_products_table_for_upsert.sql`

```sql
-- Índices criados para performance
CREATE UNIQUE INDEX products_product_unique_idx ON products(product);
CREATE INDEX products_product_application_idx ON products(product, application);
CREATE INDEX products_price_idx ON products(price);
CREATE INDEX products_stock_idx ON products(stock);
CREATE INDEX products_updated_at_idx ON products(updated_at DESC);

-- Triggers automáticos
CREATE TRIGGER update_products_updated_at 
    BEFORE UPDATE ON products FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Constraints de validação
ALTER TABLE products ADD CONSTRAINT products_price_positive CHECK (price >= 0);
ALTER TABLE products ADD CONSTRAINT products_stock_non_negative CHECK (stock >= 0);
```

### 3. Componente Frontend
**Arquivo**: `presentation/components/products/ProductSmartImport.tsx`

Interface avançada com:
- Seleção de estratégia de importação
- Preview inteligente dos dados
- Detecção automática de IDs
- Progress bar em tempo real
- Relatório detalhado de resultados

## 🧠 Estratégias de Importação

### 1. **AUTO (Recomendada)**
```sql
-- Se há IDs nos dados → UPSERT por ID
-- Se não há IDs → UPSERT por nome do produto
-- Evita duplicatas automaticamente
```

### 2. **UPSERT_BY_ID**
```sql
INSERT INTO products (id, product, stock, price, application, updated_at)
VALUES (...)
ON CONFLICT (id) DO UPDATE SET
    product = EXCLUDED.product,
    stock = EXCLUDED.stock,
    price = EXCLUDED.price,
    application = EXCLUDED.application,
    updated_at = EXCLUDED.updated_at;
```

### 3. **UPSERT_BY_NAME**
```sql
INSERT INTO products (product, stock, price, application, created_at, updated_at)
VALUES (...)
ON CONFLICT (product) DO UPDATE SET
    stock = EXCLUDED.stock,
    price = EXCLUDED.price,
    application = EXCLUDED.application,
    updated_at = EXCLUDED.updated_at;
```

### 4. **INSERT_ONLY**
```sql
-- Inserção simples, pode gerar duplicatas
INSERT INTO products (product, stock, price, application, created_at, updated_at)
VALUES (...);
```

## 📊 Formatos de Arquivo Suportados

### Formato Básico (sem IDs)
```
PRODUTO;ESTOQUE;PREÇO;APLICAÇÃO
PARAFUSO M6;100;1.50;Motor 1.0
PORCA M6;50;0.75;Fixação geral
ARRUELA LISA;200;0.25;Uso geral
```

### Formato com IDs (para atualizações)
```
PRODUTO;ESTOQUE;PREÇO;APLICAÇÃO;ID
PARAFUSO M6;100;1.50;Motor 1.0;123
PORCA M6;50;0.75;Fixação geral;456
ARRUELA NOVA;300;0.30;Novo produto;
```

## ⚡ Performance e Otimizações

### Processamento em Lotes
```typescript
const batchSize = 500 // Otimizado para PostgreSQL
for (let i = 0; i < products.length; i += batchSize) {
  const batch = products.slice(i, i + batchSize)
  await supabase.from("products").upsert(batch)
}
```

### Índices Estratégicos
- **products_product_unique_idx**: UPSERT por nome (único)
- **products_product_application_idx**: Buscas compostas
- **products_updated_at_idx**: Auditoria e relatórios

### Validações Otimizadas
```typescript
// Validação em memória antes do banco
const validateAndParsePrice = (price: any): number => {
  const numPrice = Number.parseFloat(price)
  if (isNaN(numPrice)) return 0.0
  if (numPrice > 99999999.99) return 99999999.99
  if (numPrice < 0) return 0.0
  return Math.round(numPrice * 100) / 100
}
```

## 📈 Métricas de Performance

### Benchmarks Esperados
- **10.000 produtos novos**: ~30-45 segundos
- **10.000 produtos mistos (50% update)**: ~25-35 segundos
- **100.000 produtos**: ~5-8 minutos
- **Memória utilizada**: ~50-100MB por lote

### Limites Recomendados
- **Arquivo máximo**: 50MB (~500.000 produtos)
- **Lote recomendado**: 500-1000 produtos
- **Timeout**: 5 minutos por requisição

## 🔍 Monitoramento e Diagnóstico

### Função de Estatísticas
```sql
-- Usar para monitorar a tabela
SELECT * FROM get_products_import_stats();

-- Retorna:
-- total_products, avg_price, total_stock, products_with_application, last_update
```

### View de Duplicatas
```sql
-- Identificar duplicatas para limpeza
SELECT * FROM products_duplicates 
ORDER BY duplicate_count DESC;
```

### Logs de Importação
```typescript
// No código, logs estruturados
console.log({
  operation: 'smart_import',
  strategy: strategy,
  batch_size: batchSize,
  total_products: products.length,
  processing_time: Date.now() - startTime
})
```

## 🚨 Cenários de Uso

### Cenário 1: Primeira Importação
```typescript
// 10.448 produtos novos
{
  "strategy": "insert_only", // Mais rápido para dados novos
  "expected_result": {
    "inserted": 10448,
    "updated": 0,
    "time": "~60 segundos"
  }
}
```

### Cenário 2: Atualização de Preços
```typescript
// Arquivo com IDs existentes
{
  "strategy": "upsert_by_id",
  "expected_result": {
    "inserted": 0,
    "updated": 10448,
    "time": "~45 segundos"
  }
}
```

### Cenário 3: Importação Mista
```typescript
// 70% produtos existentes + 30% novos
{
  "strategy": "auto", // Detecta automaticamente
  "expected_result": {
    "inserted": 3134,
    "updated": 7314,
    "time": "~50 segundos"
  }
}
```

### Cenário 4: Arquivo Grande (100k produtos)
```typescript
{
  "strategy": "upsert_by_name",
  "batch_size": 1000,
  "expected_result": {
    "total_time": "~8 minutos",
    "memory_usage": "~200MB",
    "cpu_usage": "Médio"
  }
}
```

## 🛡️ Tratamento de Erros

### Erros Comuns e Soluções

#### 1. Erro de Conflito de UNIQUE
```sql
-- Causa: Produtos duplicados no arquivo
-- Solução: Usar strategy "upsert_by_name"
ERROR: duplicate key value violates unique constraint "products_product_unique_idx"
```

#### 2. Erro de Validação
```typescript
// Causa: Dados inválidos
"Linha 1523: Preço deve ser um número válido (ABC)"

// Solução: Validação prévia no frontend
const errors = products.map(validateProduct).filter(Boolean)
```

#### 3. Timeout de Importação
```typescript
// Causa: Arquivo muito grande
// Solução: Reduzir batch_size ou dividir arquivo

const batchSize = file.size > 10_000_000 ? 200 : 500
```

## 🔧 Troubleshooting

### Performance Lenta
```sql
-- 1. Verificar índices
SELECT schemaname, tablename, indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'products';

-- 2. Analisar plano de execução
EXPLAIN ANALYZE 
INSERT INTO products (...) 
ON CONFLICT (product) DO UPDATE SET ...;

-- 3. Atualizar estatísticas
ANALYZE products;
```

### Memória Insuficiente
```typescript
// Reduzir tamanho do lote
const batchSize = process.env.NODE_ENV === 'production' ? 200 : 500

// Limitar tamanho do arquivo
const maxFileSize = 10 * 1024 * 1024 // 10MB
```

### Dados Inconsistentes
```sql
-- Verificar constraints violadas
SELECT * FROM products 
WHERE price < 0 OR stock < 0 OR LENGTH(TRIM(product)) = 0;

-- Limpar dados inválidos
DELETE FROM products 
WHERE LENGTH(TRIM(product)) = 0;
```

## 📚 Próximos Passos

### Melhorias Futuras
1. **Cache Redis**: Para validações de produtos existentes
2. **Workers Background**: Para importações grandes
3. **Webhooks**: Notificações de conclusão
4. **API GraphQL**: Interface mais flexível
5. **Machine Learning**: Detecção de duplicatas similares

### Integração com Outros Módulos
- **Equivalências**: Auto-criação de equivalências
- **Clientes**: Sincronização de tabelas de preço
- **Pedidos**: Atualização automática de preços em pedidos

## 🎯 Conclusão

A estratégia de importação inteligente oferece:

- **Flexibilidade**: 4 estratégias diferentes para cada cenário
- **Performance**: Otimizada para grandes volumes
- **Confiabilidade**: Validações e tratamento de erros robusto
- **Escalabilidade**: Preparada para crescimento futuro
- **Facilidade**: Interface intuitiva e automação inteligente

A implementação está pronta para produção e pode processar eficientemente os 10.448 produtos existentes plus crescimento futuro. 