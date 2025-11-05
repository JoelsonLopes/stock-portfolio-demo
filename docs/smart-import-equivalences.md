# Sistema de Importação Inteligente - Equivalences

## 📋 Visão Geral

Extensão do Sistema de Importação Inteligente para a tabela `equivalences`, implementando as mesmas funcionalidades avançadas disponíveis para produtos.

## 🗄️ Estrutura da Tabela Equivalences

```sql
CREATE TABLE equivalences (
  id BIGSERIAL PRIMARY KEY,
  product_code VARCHAR(255) NOT NULL,
  equivalent_code VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(product_code, equivalent_code)
);
```

### Campos
- **id**: ID sequencial único da equivalência
- **product_code**: Código do produto principal
- **equivalent_code**: Código equivalente/alternativo
- **created_at**: Data de criação
- **updated_at**: Data da última atualização

### Constraints
- `UNIQUE(product_code, equivalent_code)`: Evita duplicatas de equivalência
- Ambos os códigos são obrigatórios

## 🚀 API Smart Import para Equivalences

### Endpoint
`POST /api/equivalences/smart-import`

### Payload
```typescript
{
  equivalences: EquivalenceImportData[],
  strategy?: "auto" | "upsert_by_codes" | "upsert_by_id" | "insert_only"
}

interface EquivalenceImportData {
  id?: string
  product_code: string
  equivalent_code: string
}
```

### Resposta
```typescript
{
  success: boolean,
  strategy: string,
  statistics: {
    totalProcessed: number,
    inserted: number,
    updated: number,
    errors: number
  },
  message: string,
  errors: string[]
}
```

## 🎯 Estratégias de Importação para Equivalences

### 1. Auto (Recomendada)
- **Comportamento**: UPSERT por códigos (product_code + equivalent_code)
- **Uso**: Importações gerais de equivalências

### 2. UPSERT por Códigos
- **Comportamento**: Insere se não existe, atualiza se existe
- **Conflito**: Campos `product_code` + `equivalent_code`
- **Uso**: Evitar duplicatas de equivalência

### 3. UPSERT por ID
- **Comportamento**: Insere se não existe, atualiza se existe (por ID)
- **Conflito**: Campo `id`
- **Uso**: Quando IDs são conhecidos e fornecidos

### 4. Insert Only
- **Comportamento**: Apenas inserção
- **Conflito**: Pode gerar erros se houver duplicatas
- **Uso**: Dados garantidamente novos

## 🔧 Deduplificação para Equivalences

### Lógica de Deduplificação
```typescript
const deduplicateBatch = (batch: any[]) => {
  const seen = new Map<string, any>()
  
  for (const equivalence of batch) {
    const key = `${equivalence.product_code.toLowerCase().trim()}|${equivalence.equivalent_code.toLowerCase().trim()}`
    
    if (seen.has(key)) {
      // Usar o mais recente (último no array)
      const existing = seen.get(key)
      seen.set(key, {
        ...existing,
        updated_at: equivalence.updated_at
      })
    } else {
      seen.set(key, equivalence)
    }
  }
  
  return Array.from(seen.values())
}
```

### Chave de Deduplificação
- **Formato**: `product_code|equivalent_code` (case-insensitive)
- **Exemplo**: `"10E|ALT10E"`, `"ca0001|ca0001alt"`

## 🎨 Componentes Frontend

### 1. EquivalenceCSVImport (Atualizado)
- **API Nova**: `/api/equivalences/smart-import`
- **Estratégia**: Automática (UPSERT por códigos)
- **Estatísticas**: Inseridas, atualizadas, duplicatas removidas
- **Compatibilidade**: Mantém funcionalidades existentes

### 2. EquivalenceSmartImport (Novo)
- **Seleção de estratégia**: Interface para escolher método
- **Upload e texto manual**: Múltiplas formas de entrada
- **Preview avançado**: Validação prévia dos dados
- **Configurações**: Opções de processamento

## 📊 Formato de Dados

### Formato de Entrada
```
# Separador por ponto-e-vírgula
2040PM-OR;FCD0732
2040PM-OR;ALT0001
13E;EQV13E
14E;EQV14E

# Separador por vírgula
"2040PM-OR","FCD0732"
"2040PM-OR","ALT0001"
"13E","EQV13E"
"14E","EQV14E"
```

### Template Disponível
```
2040PM-OR;FCD0732
2040PM-OR;ALT0001
13E;EQV13E
14E;EQV14E
0986B03526;ALT0986B
```

## 🔄 Fluxo de Processamento

### 1. Validação de Entrada
- Verificar se ambos os códigos existem
- Validar se os códigos são diferentes
- Limpar espaços e caracteres especiais

### 2. Deduplificação
- Agrupar por chave combinada (product_code|equivalent_code)
- Manter o registro mais recente em caso de duplicatas
- Log das duplicatas removidas

### 3. Processamento em Lotes
- **Tamanho do lote**: 500 registros
- **UPSERT por conflito**: `product_code,equivalent_code`
- **Contagem precisa**: Diferenciação entre inserções e atualizações

### 4. Relatório Final
- Total processado
- Inseridas vs atualizadas
- Duplicatas removidas
- Erros detalhados

## 🛠️ Casos de Uso

### Importação Inicial de Equivalências
```typescript
POST /api/equivalences/smart-import
{
  equivalences: [
    { product_code: "10E", equivalent_code: "ALT10E" },
    { product_code: "20E", equivalent_code: "ALT20E" }
  ],
  strategy: "auto"
}
```

### Atualização de Equivalências Existentes
```typescript
POST /api/equivalences/smart-import
{
  equivalences: [
    { product_code: "10E", equivalent_code: "NEW_ALT10E" }
  ],
  strategy: "upsert_by_codes"
}
```

### Sincronização com Sistema Externo
```typescript
POST /api/equivalences/smart-import
{
  equivalences: [...], // Milhares de registros
  strategy: "auto"
}
```

## 🚨 Tratamento de Erros Específicos

### 1. Códigos Idênticos
- **Erro**: `product_code` igual a `equivalent_code`
- **Solução**: Validação prévia no frontend e backend

### 2. Códigos Vazios
- **Erro**: Campos obrigatórios vazios após limpeza
- **Solução**: Validação e sanitização automática

### 3. Duplicatas no Arquivo
- **Erro**: Mesma equivalência repetida no arquivo
- **Solução**: Deduplificação automática

## 📈 Performance

### Otimizações Implementadas
- **Índice único**: `(product_code, equivalent_code)`
- **Índices compostos**: Para buscas bidirecionais
- **Processamento em lotes**: 500 registros por vez
- **Deduplificação in-memory**: Antes do envio ao banco

### Benchmarks Esperados
- **1.000 equivalências**: ~5 segundos
- **10.000 equivalências**: ~30 segundos
- **50.000 equivalências**: ~2 minutos

## 🎨 Interface do Usuário

### Controle de Estratégia UPSERT
- ✅ **Checkbox**: "Permitir atualização de equivalências existentes (UPSERT por códigos)"
- ✅ **Estado padrão**: Habilitado (UPSERT)
- ✅ **Feedback visual**: Explanação da estratégia selecionada

#### Estados do Checkbox
```typescript
// Checkbox marcado (padrão)
strategy: allowUpdates ? "upsert_by_codes" : "insert_only"

// UPSERT: Atualiza equivalências com mesma combinação de códigos
// INSERT: Rejeita equivalências duplicadas
```

#### Feedback Para o Usuário
- **UPSERT habilitado**: "ℹ️ Equivalências com mesma combinação de códigos serão atualizadas se houver diferenças"
- **INSERT apenas**: "⚠️ Equivalências com combinação de códigos existentes serão rejeitadas (apenas inserção)"

### Relatório de Resultados Detalhado
```
Total de linhas: 18.322
Equivalências processadas: 17.980
Novas equivalências: 0
Equivalências atualizadas: 0
Equivalências sem alteração: 17.980
Duplicatas removidas: 342
Erros: 49
```

#### Explicação das Estatísticas
- **Total de linhas**: Linhas no arquivo original
- **Processadas**: Equivalências válidas importadas
- **Novas**: Combinações de códigos inéditas
- **Atualizadas**: Equivalências existentes modificadas
- **Sem alteração**: Dados idênticos aos já existentes
- **Duplicatas removidas**: Duplicatas no arquivo (não no banco)
- **Erros**: Linhas com problemas de validação

### Tratamento de Erros na Interface
- **Seção expandível**: "Ver outros erros (49)"
- **Categorização**: Códigos especiais vs outros erros
- **Sugestões automáticas**: Dicas para correção

## 🔗 Integração com Sistema Existente

### Mantém Compatibilidade
- ✅ API antiga `/api/equivalences/import` ainda funciona
- ✅ Componentes existentes mantidos
- ✅ Funcionalidades adicionais são opcionais

### Migração Sugerida
1. **Testar nova API** com dados pequenos
2. **Migrar componentes** para usar smart-import
3. **Depreciar API antiga** após validação
4. **Remover API antiga** em versão futura

## 📝 Exemplo de Uso Completo

### Frontend (React)
```typescript
const importEquivalences = async (data: string) => {
  const response = await fetch("/api/equivalences/smart-import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      equivalences: parseCSVData(data),
      strategy: "auto"
    })
  })
  
  const result = await response.json()
  console.log(`${result.statistics.inserted} inseridas, ${result.statistics.updated} atualizadas`)
}
```

### Resultado
```javascript
{
  success: true,
  strategy: "auto",
  statistics: {
    totalProcessed: 1500,
    inserted: 800,
    updated: 700,
    errors: 0
  },
  message: "Importação concluída: 800 inseridas, 700 atualizadas",
  errors: []
}
```

---

**Sistema implementado em**: Janeiro 2025  
**Compatível com**: Sistema Smart Import v1.0.0  
**Status**: ✅ Produção Ready 