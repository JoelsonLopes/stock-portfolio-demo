# Atualização: Regras de Negócio para Edição e Exclusão de Pedidos

## 🎯 Mudança Solicitada

**Requisito:** Permitir edição e exclusão de pedidos com status "Confirmado" além dos "Rascunhos"

## 📋 Regras Anteriores vs Novas

### ❌ **Regras Anteriores:**
- **Edição:** Apenas `draft` e `confirmed` ✅ (já funcionava)
- **Exclusão:** Apenas `draft` ❌ (muito restritivo)

### ✅ **Novas Regras:**
- **Edição:** `draft` e `confirmed` ✅ (mantido)
- **Exclusão:** `draft` e `confirmed` ✅ (expandido)

## 🔧 Implementação das Mudanças

### 1. **Backend - API DELETE**
**Arquivo:** `src/app/api/orders/[id]/route.ts`

```typescript
// ❌ ANTES: Apenas rascunhos
if (orderData.status !== 'draft') {
  return NextResponse.json(
    { error: 'Apenas pedidos em rascunho podem ser excluídos' },
    { status: 400 }
  )
}

// ✅ DEPOIS: Rascunhos E confirmados
if (orderData.status !== 'draft' && orderData.status !== 'confirmed') {
  return NextResponse.json(
    { error: 'Apenas pedidos em rascunho ou confirmados podem ser excluídos' },
    { status: 400 }
  )
}
```

### 2. **Frontend - Interface DELETE**
**Arquivo:** `src/presentation/components/orders/OrderList.tsx`

```typescript
// ❌ ANTES: Botão apenas para rascunhos
{onDelete && order.status === 'draft' && (
  <Button title="Excluir Rascunho">
    <Trash2 />
  </Button>
)}

// ✅ DEPOIS: Botão para rascunhos E confirmados
{onDelete && (order.status === 'draft' || order.status === 'confirmed') && (
  <Button 
    title={order.status === 'draft' ? "Excluir Rascunho" : "Excluir Pedido Confirmado"}
  >
    <Trash2 />
  </Button>
)}
```

## 🎯 Status Permitidos por Operação

### ✅ **CRIAR (POST)**
- **Status inicial:** Sempre `draft`
- **Permissões:** Todos os usuários

### ✅ **LER (GET)**
- **Status permitidos:** Todos
- **Filtros:** Por usuário (não-admin vê apenas seus pedidos)

### ✅ **EDITAR (PUT)**
- **Status permitidos:** `draft` e `confirmed`
- **Funcionalidades:**
  - Alterar itens, quantidades, preços
  - Mudar cliente
  - Alterar condição de pagamento
  - Atualizar observações
  - Modificar frete
  - Atualizar status

### ✅ **EXCLUIR (DELETE)**
- **Status permitidos:** `draft` e `confirmed` ✅ (NOVO)
- **Restrições:** 
  - `processing`, `shipped`, `delivered`, `cancelled` ❌
  - Cascata: deleta itens automaticamente

## 💼 Justificativa das Regras

### **Por que permitir exclusão de confirmados?**
1. **Flexibilidade:** Correções de pedidos mal feitos
2. **Operacional:** Pedidos duplicados ou incorretos
3. **Cancelamento:** Alternativa ao status `cancelled`

### **Por que NÃO permitir exclusão de outros status?**
- **`processing`:** Pedido em produção/separação
- **`shipped`:** Já enviado, dados históricos importantes
- **`delivered`:** Concluído, necessário para relatórios
- **`cancelled`:** Histórico de cancelamento importante

## 🎨 Interface do Usuário

### **Tooltips Dinâmicos:**
- **Rascunho:** "Excluir Rascunho"
- **Confirmado:** "Excluir Pedido Confirmado"

### **Botões de Ação por Status:**
| Status | Editar | Excluir | Imprimir |
|--------|---------|---------|----------|
| `draft` | ✅ | ✅ | ✅ |
| `confirmed` | ✅ | ✅ | ✅ |
| `processing` | ❌ | ❌ | ✅ |
| `shipped` | ❌ | ❌ | ✅ |
| `delivered` | ❌ | ❌ | ✅ |
| `cancelled` | ❌ | ❌ | ✅ |

## 🧪 Testes de Validação

### **Cenários a Testar:**
1. ✅ **Excluir rascunho:** Deve funcionar
2. ✅ **Excluir confirmado:** Deve funcionar (NOVO)
3. ❌ **Excluir processando:** Deve retornar erro 400
4. ❌ **Excluir enviado:** Deve retornar erro 400
5. ✅ **Editar confirmado:** Deve funcionar
6. ✅ **Interface:** Botões aparecem apenas para status permitidos

### **Mensagens de Erro:**
```
"Apenas pedidos em rascunho ou confirmados podem ser excluídos"
```

## 📊 Impacto

### ✅ **Benefícios:**
- **Flexibilidade:** Maior controle sobre pedidos
- **Produtividade:** Menos bloqueios operacionais  
- **UX:** Interface mais intuitiva
- **Eficiência:** Correções mais rápidas

### ⚠️ **Considerações:**
- **Cuidado:** Exclusão de confirmados deve ser consciente
- **Auditoria:** Logs de exclusão importantes
- **Treinamento:** Usuários devem entender as implicações

## 🔄 Histórico de Mudanças

| Data | Versão | Mudança |
|------|--------|---------|
| Anterior | 1.0 | Exclusão apenas de rascunhos |
| Atual | 1.1 | Exclusão de rascunhos + confirmados |

## 🚀 Deploy

**Status:** ✅ **IMPLEMENTADO**
- Backend: Validações atualizadas
- Frontend: Interface ajustada  
- Logs de debug: Removidos
- Documentação: Completa

---

**Resultado:** Usuários agora podem editar e excluir pedidos tanto em **rascunho** quanto **confirmados**, oferecendo maior flexibilidade operacional. 