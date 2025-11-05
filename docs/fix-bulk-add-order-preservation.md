# 🔧 Correção: Preservação da Ordem em Bulk Add

## 📋 Problema

Quando produtos eram adicionados em lote usando o `BulkAddProductsFlow`, os itens não mantinham a ordem inserida no textarea. 

**Exemplo do problema:**
```
Input no textarea:
WOE462,1
WOE455,4
WOE440,2
WO545,1
WOE506,1

Resultado no pedido: Ordem aleatória ❌
```

## 🎯 Causa Raiz

1. **Inserção simultânea**: Itens inseridos quase ao mesmo tempo no banco
2. **Ordenação por `created_at`**: Não garantia ordem exata de inserção
3. **Ausência de índice de ordem**: Sem campo específico para sequência

## ✅ Solução Implementada

### 1. **Índice de Ordem no Backend**

**Arquivo**: `src/presentation/components/orders/BulkAddProductsFlow.tsx`

```typescript
// ✅ Adicionar índice sequencial no client_ref
client_ref: `BULK_ADD_${Date.now()}_${index.toString().padStart(3, '0')}`
```

- **Formato**: `BULK_ADD_1703123456789_001`
- **Componentes**: 
  - `BULK_ADD_`: Identificador de bulk add
  - `timestamp`: Momento da operação
  - `index`: Posição sequencial (001, 002, 003...)

### 2. **Ordenação na API**

**Arquivo**: `src/app/api/orders/[id]/items/route.ts`

```typescript
.order('client_ref', { nullsFirst: false })
.order('created_at')
```

- **Prioridade 1**: `client_ref` (preserva ordem bulk add)
- **Prioridade 2**: `created_at` (fallback para itens individuais)

### 3. **Ordenação no Frontend**

**Arquivo**: `src/presentation/components/orders/OrderItemsTable.tsx`

```typescript
const sortItems = (items: OrderItem[]) => {
  return [...items].sort((a, b) => {
    const aIsBulkAdd = a.client_ref?.startsWith('BULK_ADD_')
    const bIsBulkAdd = b.client_ref?.startsWith('BULK_ADD_')
    
    if (aIsBulkAdd && bIsBulkAdd) {
      // Ordenar pelo índice sequencial
      const aIndex = a.client_ref?.split('_').pop() || '000'
      const bIndex = b.client_ref?.split('_').pop() || '000'
      return aIndex.localeCompare(bIndex)
    }
    
    if (aIsBulkAdd && !bIsBulkAdd) return -1
    if (!aIsBulkAdd && bIsBulkAdd) return 1
    
    return a.id.localeCompare(b.id)
  })
}
```

### 4. **Campo Client_Ref Limpo**

**Arquivo**: `src/presentation/components/orders/OrderItemsTable.tsx`

```typescript
// ✅ Função para esconder códigos técnicos na interface
const getDisplayClientRef = (clientRef?: string) => {
  if (!clientRef) return ''
  // Se é código técnico de bulk add, retorna vazio
  if (clientRef.startsWith('BULK_ADD_')) return ''
  // Senão, retorna o valor original
  return clientRef
}

const handleClientRefChange = (itemId: string, value: string) => {
  const item = sortedItems.find(i => i.id === itemId)
  
  // Se o item tem código técnico de bulk add, preserva ele internamente
  if (item?.client_ref?.startsWith('BULK_ADD_')) {
    return // Não permite edição para manter ordenação
  }
  
  // Para itens normais, atualiza normalmente
  onItemUpdate(itemId, { client_ref: value })
}
```

## 🎯 Resultado

**Antes:**
```
WOE440 - Qtd: 2
WO545 - Qtd: 1  
WOE462 - Qtd: 1
WOE506 - Qtd: 1
WOE455 - Qtd: 4
```

**Depois:**
```
WOE462 - Qtd: 1  ✅
WOE455 - Qtd: 4  ✅  
WOE440 - Qtd: 2  ✅
WO545 - Qtd: 1   ✅
WOE506 - Qtd: 1  ✅
```

## 🔄 Problemas Adicionais Resolvidos

### ❌ **Problema 1**: Campo "Ref. Cliente" mostrando código técnico
- **Antes**: Campo mostrava `BULK_ADD_1703123456789_001`
- **Depois**: Campo fica vazio para itens de bulk add
- **Solução**: Função `getDisplayClientRef()` que esconde códigos técnicos

### ❌ **Problema 2**: Desconto não sendo aplicado
- **Verificação**: Dados de desconto são corretamente salvos e exibidos
- **Solução**: Melhoria na exibição e edição de descontos

## 🔄 Compatibilidade

- ✅ **Itens individuais**: Continuam funcionando normalmente
- ✅ **Bulk add antigo**: Sem `client_ref` são ordenados por ID
- ✅ **Bulk add novo**: Ordenados pela sequência original
- ✅ **Misto**: Bulk add primeiro, depois individuais
- ✅ **Campo Ref. Cliente**: Funcional apenas para itens normais

## 🧪 Como Testar

1. Acesse um pedido existente
2. Clique em "Adicionar em Lote"
3. **Selecione um desconto** (ex: "Desconto Padrão")
4. Cole códigos na ordem específica:
   ```
   PROD001,1
   PROD002,2  
   PROD003,3
   ```
5. Verifique se:
   - ✅ Aparecem na mesma ordem no pedido
   - ✅ Campo "Ref. Cliente" está vazio
   - ✅ Desconto foi aplicado corretamente

## 📊 Performance

- **Impact mínimo**: Apenas um campo adicional no `client_ref`
- **Índice existente**: Uso do campo já existente na tabela
- **Cache friendly**: Ordenação feita em memória no frontend 