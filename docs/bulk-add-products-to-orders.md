# 📦 Funcionalidade: Adicionar Produtos em Lote aos Pedidos

## 🎯 Visão Geral
Esta funcionalidade permite aos usuários adicionar múltiplos produtos a um pedido de forma rápida e eficiente, informando código e quantidade de cada produto em uma única operação.

## 🚀 Como Utilizar

### 📍 Localização
- **Página**: Edição de Pedidos (`/orders/[id]`)
- **Acesso**: Botão "Adicionar em Lote" ao lado do botão "Adicionar Produto"
- **Disponibilidade**: Apenas para pedidos já salvos (com ID)

### 📝 Formato de Entrada
Os produtos devem ser inseridos no formato:
```
CODIGO,QUANTIDADE
```

**Exemplo:**
```
WOE451,2
WAP181,1
WAP184,3
```

### 🔧 Funcionalidades

#### ✅ Validações
- **Máximo**: 50 produtos por operação
- **Formato**: Código obrigatório + quantidade numérica positiva
- **Duplicatas**: Códigos duplicados são tratados automaticamente
- **Normalização**: Códigos convertidos para maiúsculas

#### 💰 Sistema de Descontos
- **Opcional**: Dropdown com descontos ativos
- **Aplicação**: Desconto aplicado automaticamente a todos os produtos
- **Cálculo**: Preço original → Desconto → Preço final
- **Comissão**: Calculada automaticamente com base no desconto

#### 📊 Resultados
**Produtos Encontrados:**
- ✅ Código do produto
- 📦 Quantidade solicitada
- 📋 Estoque disponível
- 💵 Preço unitário (com/sem desconto)
- 💰 Total do item

**Produtos Não Encontrados:**
- ❌ Lista de códigos não localizados
- 🚨 Badges vermelhos para fácil identificação

## 🏗️ Arquitetura Técnica

### 🔌 API Endpoint
```
POST /api/orders/bulk-add-items
```

**Request Body:**
```json
{
  "items": [
    { "code": "WOE451", "quantity": 2 },
    { "code": "WAP181", "quantity": 1 }
  ],
  "discountId": "optional-discount-id",
  "orderId": "pedido-id"
}
```

**Response:**
```json
{
  "success": true,
  "statistics": {
    "total": 2,
    "found": 2,
    "notFound": 0,
    "inserted": 2
  },
  "results": {
    "found": [
      {
        "code": "WOE451",
        "name": "WOE451",
        "quantity": 2,
        "originalPrice": 100.00,
        "priceWithDiscount": 85.00,
        "totalPrice": 170.00
      }
    ],
    "notFound": []
  },
  "discountApplied": {
    "id": "discount-id",
    "name": "Desconto 15%",
    "percentage": 15.0
  }
}
```

### 🧩 Componentes

#### `BulkAddProductsFlow.tsx`
- **Localização**: `src/presentation/components/orders/BulkAddProductsFlow.tsx`
- **Responsabilidade**: Interface modal para entrada de dados e exibição de resultados
- **Tecnologias**: React, React Query, shadcn/ui

#### Integração com `OrderForm.tsx`
- **Botão**: Condicionalmente exibido para pedidos existentes
- **Estado**: Controle de abertura/fechamento da modal
- **Callback**: Recarregamento da página após sucesso

### 🗄️ Fluxo de Dados

1. **Entrada**: Usuário insere códigos e quantidades
2. **Validação**: Cliente-side validation para formato
3. **Normalização**: Códigos convertidos para maiúsculas
4. **API Call**: Envio para endpoint de bulk-add-items
5. **Processamento**: 
   - Busca produtos no banco
   - Aplica desconto (se selecionado)
   - Calcula totais e comissões
   - Insere itens no pedido
6. **Resposta**: Estatísticas e resultados detalhados
7. **Feedback**: Toast notifications + atualização da interface

## ⚡ Performance e Limitações

### 📊 Limites
- **Produtos**: Máximo 50 por operação
- **Timeout**: Standard HTTP timeout
- **Concorrência**: Operações sequenciais recomendadas

### 🔍 Otimizações
- **Bulk Insert**: Inserção em lote no banco de dados
- **Query Otimizada**: Busca de produtos com IN clause
- **Deduplicação**: Códigos duplicados removidos automaticamente
- **Transações**: Operação atômica (sucesso ou falha total)

## 🛡️ Segurança

### 🔐 Validações de Segurança
- **RLS**: Row Level Security aplicada automaticamente
- **Autorização**: Verificação de acesso ao pedido
- **Sanitização**: Inputs limpos e validados
- **SQL Injection**: Queries parametrizadas

### ✅ Validações de Negócio
- **Pedido Existente**: Verificação de existência do pedido
- **Produtos Válidos**: Validação de códigos no banco
- **Descontos Ativos**: Apenas descontos ativos são aplicáveis
- **Quantidades**: Números positivos obrigatórios

## 🎨 Interface do Usuário

### 📱 Responsividade
- **Desktop**: Layout em duas colunas (form + resultados)
- **Mobile**: Layout empilhado com scroll otimizado
- **Tablets**: Adaptação automática baseada em breakpoints

### 🎯 UX/UI
- **Estados Visuais**: Loading, sucesso, erro, vazio
- **Feedback Imediato**: Toasts para todas as ações
- **Cores Semânticas**: Verde (sucesso), vermelho (erro), azul (info)
- **Acessibilidade**: Labels, ARIA attributes, navegação por teclado

### 📄 Componentes de Interface
- **Textarea**: Entrada de códigos com font monospace
- **Select**: Dropdown de descontos
- **Table**: Resultados em tabela responsiva
- **Badges**: Status visual para produtos e quantidades
- **Loading**: Spinner durante processamento

## 🧪 Exemplos de Uso

### 📝 Exemplo Básico
```
WOE451,2
WAP181,1
WAP184,3
```

### 💰 Com Desconto
```
Produtos:
WOE451,5
WAP181,10
WAP184,2

Desconto: "Desconto Especial 20%"
```

### 🚨 Tratamento de Erros
```
WOE451,2    ✅ Encontrado
INVALID,1   ❌ Não encontrado
WAP181,abc  🔧 Quantidade inválida
```

## 🔮 Futuras Melhorias

### 📋 Roadmap
- [ ] **Upload CSV**: Importação via arquivo
- [ ] **Histórico**: Log de operações em lote
- [ ] **Preview**: Pré-visualização antes da confirmação
- [ ] **Validação de Estoque**: Alerta para estoque insuficiente
- [ ] **Múltiplos Descontos**: Desconto por produto individual
- [ ] **Edição em Lote**: Modificar quantidades após inserção

### 🛠️ Melhorias Técnicas
- [ ] **Cache**: Cache de produtos frequentes
- [ ] **Paginação**: Para resultados grandes
- [ ] **Exportação**: Resultados em Excel/PDF
- [ ] **API Pagination**: Para operações muito grandes
- [ ] **Websockets**: Feedback em tempo real

---

## 📚 Arquivos Relacionados

### 🔧 Backend
- `src/app/api/orders/bulk-add-items/route.ts` - Endpoint principal
- `src/app/api/orders/[id]/items/route.ts` - API de itens do pedido

### 🎨 Frontend
- `src/presentation/components/orders/BulkAddProductsFlow.tsx` - Componente modal
- `src/presentation/components/orders/OrderForm.tsx` - Integração no formulário
- `src/presentation/types/order.types.ts` - Tipos TypeScript

### 📖 Documentação
- `src/docs/bulk-add-products-to-orders.md` - Este documento
- `src/docs/orders-implementation-plan.md` - Documentação geral de pedidos

---

*Implementado em: Janeiro 2025*  
*Versão: 1.0.0*  
*Status: ✅ Concluído e Testado* 