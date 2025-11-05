# Auditoria Completa: CRUD de Orders

## 🎯 Problema Atual
**Erro 500** ao editar pedidos via PUT `/api/orders/{id}`

## 🔍 Análise dos Problemas Identificados

### 1. ❌ **PUT - Edição de Pedidos (ERRO 500)**

#### Problema Principal:
- **Local:** `src/app/api/orders/[id]/route.ts` 
- **Sintoma:** Internal Server Error ao tentar salvar edições
- **Causa Raiz:** Possível incompatibilidade de dados entre frontend e backend

#### Problemas Específicos Encontrados:

1. **Missing shipping_rate no cálculo total:**
```typescript
// ❌ ANTES: Não incluía shipping_rate
const total = subtotal - totalDiscount

// ✅ CORREÇÃO APLICADA:
const total = subtotal - totalDiscount + (shipping_rate || 0)
```

2. **Falta de original_unit_price na inserção de itens:**
```typescript
// ❌ ANTES: Campo ausente
{
  order_id: orderId,
  product_id: item.product_id,
  // ... outros campos
}

// ✅ CORREÇÃO APLICADA:
{
  order_id: orderId,
  product_id: item.product_id,
  original_unit_price: item.original_unit_price || item.unit_price,
  client_ref: item.client_ref || null,
  // ... outros campos
}
```

3. **Logs de debug adicionados** para identificar dados enviados

### 2. ✅ **GET - Leitura de Pedidos (OK)**

#### Status: **FUNCIONANDO**
- **Individual:** `GET /api/orders/{id}` ✅
- **Lista:** `GET /api/orders` ✅
- **Filtros:** Busca, paginação, status ✅
- **Segurança:** Isolamento por usuário ✅

### 3. ✅ **POST - Criação de Pedidos (OK)**

#### Status: **FUNCIONANDO**
- **Endpoint:** `POST /api/orders` ✅
- **Validações:** Cliente, itens, totais ✅
- **Segurança:** Validação de permissões ✅
- **Numeração:** Auto-incremento funcionando ✅

### 4. ✅ **DELETE - Deleção de Pedidos (CORRIGIDO)**

#### Status: **FUNCIONANDO** (após correção anterior)
- **Validação:** Apenas rascunhos (`draft`) ✅
- **Cascata:** Deleta itens primeiro ✅
- **Interface:** Botão só aparece para rascunhos ✅

## 🏗️ Estruturas de Dados

### Frontend → Backend (PUT)
```typescript
// OrderFormData enviado
{
  client_id: number | null,
  payment_condition_id: string | null,
  notes: string,
  items: OrderItem[],
  shipping_rate: number
}
```

### Validações do Backend
```typescript
// Validação atual (possivelmente problemática)
if (!client_id || !items || !Array.isArray(items) || items.length === 0) {
  return 400
}
```

## 🐛 Problemas Potenciais Restantes

### 1. **Tipos de Dados Inconsistentes**
- `client_id` pode ser `null` no frontend mas backend espera `number`
- `payment_condition_id` pode ser `null` no frontend

### 2. **Validações Muito Restritivas**
```typescript
// ❌ Pode falhar se client_id for null temporariamente
if (!client_id || !items || !Array.isArray(items) || items.length === 0)
```

### 3. **Campos Opcionais vs Obrigatórios**
- Frontend pode enviar campos como `null`
- Backend não trata adequadamente valores `null`

## 🔧 Correções Implementadas

### 1. **Logs de Debug**
```typescript
console.log('📥 PUT Order Body received:', JSON.stringify(body, null, 2));
console.log('🔍 Validando dados:', { client_id, items_length: items?.length });
console.log('📦 Item to insert:', newItem);
```

### 2. **shipping_rate incluído**
```typescript
const updateData = {
  // ... outros campos
  shipping_rate: shipping_rate || 0,
}
```

### 3. **Campos ausentes em order_items**
```typescript
{
  // ... campos existentes
  original_unit_price: item.original_unit_price || item.unit_price,
  client_ref: item.client_ref || null,
}
```

## 📋 Testes Necessários

### Cenários para Validar:
1. ✅ **Criar pedido novo** - Funcionando
2. ✅ **Listar pedidos** - Funcionando  
3. ✅ **Ver pedido individual** - Funcionando
4. ⏳ **Editar pedido existente** - Em teste (com logs)
5. ✅ **Deletar rascunho** - Funcionando
6. ⏳ **Atualizar apenas status** - Em teste

### Casos Específicos de Edição:
1. **Pedido com itens:** ⏳ Testando
2. **Pedido sem shipping_rate:** ⏳ Testando
3. **Pedido com discount_id null:** ⏳ Testando
4. **Pedido com client_ref null:** ⏳ Testando

## 🚨 Próximos Passos

### 1. **Executar Teste com Logs**
- Reproduzir erro 500 para ver dados enviados
- Analisar logs de validação
- Identificar campo específico que está falhando

### 2. **Melhorar Validações**
```typescript
// ✅ Validação mais robusta sugerida
if (!client_id && client_id !== 0) {
  return NextResponse.json({ error: 'Cliente é obrigatório' }, { status: 400 })
}

if (!items || !Array.isArray(items)) {
  return NextResponse.json({ error: 'Items são obrigatórios' }, { status: 400 })
}

if (items.length === 0) {
  return NextResponse.json({ error: 'Pelo menos um item é obrigatório' }, { status: 400 })
}
```

### 3. **Sanitizar Dados de Entrada**
```typescript
// ✅ Sanitização sugerida
const sanitizedData = {
  client_id: client_id || null,
  payment_condition_id: payment_condition_id || null,
  notes: notes || '',
  shipping_rate: Number(shipping_rate) || 0,
  items: (items || []).map(item => ({
    ...item,
    quantity: Number(item.quantity) || 0,
    unit_price: Number(item.unit_price) || 0,
    // ... outros campos
  }))
}
```

## 📊 Status Geral do CRUD

- ✅ **CREATE (POST)**: Funcionando
- ✅ **READ (GET)**: Funcionando  
- ⚠️ **UPDATE (PUT)**: Em correção (logs adicionados)
- ✅ **DELETE**: Funcionando

## 🎯 Foco da Investigação

**Próximo passo:** Testar a edição de pedido com os logs implementados para identificar exatamente qual validação ou inserção está falhando no PUT.

---

**Atualização:** Logs de debug implementados para identificar causa raiz do erro 500 no PUT. 