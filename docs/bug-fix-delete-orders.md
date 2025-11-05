# Correção: Bug na Deleção de Pedidos

## 🚨 Problema Identificado

**Erro:** 400 Bad Request ao tentar deletar pedidos
**Mensagem:** "Apenas pedidos pendentes podem ser excluídos"

### Sintomas:
- DELETE para `/api/orders/{id}` retornava erro 400
- Usuários não conseguiam deletar pedidos recém-criados
- Erro no console: "Apenas pedidos pendentes podem ser excluídos"




## 🔍 Análise da Causa Raiz

### Conflito de Status:
1. **Na criação** (`/api/orders` POST): Pedidos são criados com status `'draft'`
2. **Na validação de deleção** (`/api/orders/[id]` DELETE): Sistema só permitia deletar pedidos com status `'pending'`

```typescript
// ❌ PROBLEMA: Status incompatíveis
// Criação - route.ts:317
status: orderData.status || 'draft'

// Validação Delete - [id]/route.ts:361
if (orderData.status !== 'pending') {
  return NextResponse.json(
    { error: 'Apenas pedidos pendentes podem ser excluídos' },
    { status: 400 }
  )
}
```

### Status Disponíveis no Sistema:
- `draft` - Rascunho (status padrão na criação) ✅
- `confirmed` - Confirmado
- `processing` - Processando
- `shipped` - Enviado
- `delivered` - Entregue
- `cancelled` - Cancelado
- ~~`pending`~~ - Não existe no sistema! ❌

## ✅ Correção Implementada

### 1. Backend - API de Deleção
**Arquivo:** `src/app/api/orders/[id]/route.ts`

```typescript
// ✅ ANTES - Lógica incorreta
if (orderData.status !== 'pending') {
  return NextResponse.json(
    { error: 'Apenas pedidos pendentes podem ser excluídos' },
    { status: 400 }
  )
}

// ✅ DEPOIS - Lógica corrigida
if (orderData.status !== 'draft') {
  return NextResponse.json(
    { error: 'Apenas pedidos em rascunho podem ser excluídos' },
    { status: 400 }
  )
}
```

### 2. Frontend - Interface do Usuário
**Arquivo:** `src/presentation/components/orders/OrderList.tsx`

```typescript
// ✅ ANTES - Botão sempre visível
{onDelete && (
  <Button onClick={() => onDelete(order.id)}>
    <Trash2 />
  </Button>
)}

// ✅ DEPOIS - Botão apenas para rascunhos
{onDelete && order.status === 'draft' && (
  <Button
    onClick={() => onDelete(order.id)}
    title="Excluir Rascunho"
  >
    <Trash2 />
  </Button>
)}
```

### 3. Melhoria na Resposta da API
```typescript
// ✅ Retorno melhorado com número do pedido
return NextResponse.json({
  message: `Pedido ${orderData.order_number} excluído com sucesso`,
  orderNumber: orderData.order_number
})
```

## 📊 Regras de Negócio

### Permissões de Deleção:
- ✅ **Rascunhos (`draft`)**: Podem ser deletados
- ❌ **Confirmados e posteriores**: Não podem ser deletados
- 🎯 **Lógica**: Apenas pedidos não processados podem ser removidos

### Interface do Usuário:
- 👁️ **Visibilidade**: Botão delete só aparece para rascunhos
- 🏷️ **Tooltip**: "Excluir Rascunho" para clareza
- 🎨 **Estilo**: Hover vermelho consistente

## 🧪 Validação

### Cenários Testados:
1. ✅ **Deletar rascunho**: Funciona corretamente
2. ✅ **Tentar deletar confirmado**: Botão não aparece
3. ✅ **Resposta da API**: Retorna número do pedido
4. ✅ **Mensagem de sucesso**: Exibida corretamente
5. ✅ **Cache invalidation**: Lista atualiza automaticamente

### Status de Teste:
- ✅ Desenvolvimento: Validado
- ⏳ Produção: Aguardando deploy

## 🔄 Impacto

### ✅ Benefícios:
- **Funcionalidade**: Deleção funciona conforme esperado
- **UX**: Interface mais clara sobre quando deletar
- **Consistência**: Status alinhados em todo sistema
- **Segurança**: Impede deleção acidental de pedidos processados

### ⚠️ Considerações:
- **Breaking Change**: Não impacta usuários (funcionalidade estava quebrada)
- **Comportamento**: Apenas rascunhos podem ser deletados (intencionalmente restritivo)

## 📝 Arquivos Modificados

1. **`src/app/api/orders/[id]/route.ts`**
   - Correção da validação de status
   - Melhoria na resposta da API

2. **`src/presentation/components/orders/OrderList.tsx`**
   - Condicional no botão de delete
   - Melhoria no tooltip

3. **`src/docs/bug-fix-delete-orders.md`**
   - Esta documentação

## 🚀 Deploy

```bash
# Commits sugeridos
git add src/app/api/orders/[id]/route.ts
git commit -m "fix(orders): corrige validação de status para deleção de pedidos

- Altera validação de 'pending' para 'draft'
- Corrige conflito entre status de criação e deleção
- Melhora resposta da API com número do pedido
- Fixes: DELETE /api/orders/{id} retornando 400"

git add src/presentation/components/orders/OrderList.tsx
git commit -m "improve(ui): mostra botão delete apenas para rascunhos

- Adiciona validação order.status === 'draft'
- Melhora tooltip para 'Excluir Rascunho'
- Adiciona hover vermelho consistente"

git add src/docs/bug-fix-delete-orders.md
git commit -m "docs: documenta correção do bug de deleção de pedidos"
```

---

**Status:** ✅ **RESOLVIDO**
**Data:** [Data da correção]
**Impacto:** Deleção de pedidos funcionando corretamente
