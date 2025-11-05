# Sistema de Pendências - Documentação

## Visão Geral

O Sistema de Pendências é uma funcionalidade que gerencia automaticamente situações onde a quantidade solicitada de um produto excede o estoque disponível. Quando isso ocorre, o sistema divide a quantidade em duas partes:
- **Quantidade Disponível**: Exibida no campo "Qtd" (limitada ao estoque)
- **Quantidade Pendente**: Exibida no campo "Pend." (diferença entre solicitado e disponível)

## Como Funciona

### 1. Cálculo Automático
Quando um usuário adiciona um produto ao pedido:

```typescript
const availableStock = Number(selectedProduct.stock)
let actualQuantity = quantity
let pendingQuantity = 0
let hasPending = false

if (quantity > availableStock) {
  actualQuantity = availableStock > 0 ? availableStock : 0
  pendingQuantity = quantity - actualQuantity
  hasPending = pendingQuantity > 0
}
```

**Exemplo prático:**
- Produto em estoque: 10 unidades
- Quantidade solicitada: 15 unidades
- **Resultado:**
  - Qtd: 10 (quantidade disponível)
  - Pend: 5 (quantidade pendente)

### 2. Estrutura de Dados

#### Campos na Tabela `order_items`
```sql
pending_quantity INTEGER DEFAULT 0,     -- Quantidade pendente
has_pending BOOLEAN DEFAULT FALSE       -- Flag indicando se tem pendência
```

#### Campos na Tabela `orders`
```sql
has_pending_items BOOLEAN DEFAULT FALSE -- Flag indicando se o pedido tem itens pendentes
```

#### Interface TypeScript
```typescript
interface OrderItem {
  // ... outros campos
  pending_quantity?: number  // Quantidade pendente quando excede estoque
  has_pending?: boolean      // Flag indicando se tem pendência
}

interface OrderFormData {
  // ... outros campos
  has_pending_items?: boolean // Flag indicando se pedido tem pendências
}
```

## Implementação nos Componentes

### 1. AddProductFlow.tsx
- Calcula pendências automaticamente ao adicionar produtos
- Aplica lógica de controle de estoque
- Atualiza campos `pending_quantity` e `has_pending`

### 2. BulkAddProductsFlow.tsx
- Implementa cálculo de pendências para adição em lote
- Processa múltiplos produtos simultaneamente
- Mantém consistência com adição individual

### 3. OrderItemsTable.tsx
- Exibe coluna "Pend." entre # e Produto
- Utiliza estilo visual distintivo (círculo vermelho)
- Mostra "-" quando não há pendências

```tsx
{item.has_pending && item.pending_quantity ? (
  <div className="text-center">
    <span className="inline-flex items-center justify-center w-8 h-8 text-xs font-medium bg-red-100 text-red-800 rounded-full">
      {item.pending_quantity}
    </span>
  </div>
) : (
  <div className="text-center text-muted-foreground text-xs">-</div>
)}
```

## Persistência de Dados

### 1. API de Criação (POST /api/orders)
```typescript
const orderItems = orderData.items.map((item: any) => ({
  // ... outros campos
  pending_quantity: item.pending_quantity || 0,
  has_pending: item.has_pending || false
}));

// Verificar se há itens com pendência no pedido
const hasPendingItems = orderData.items?.some((item: any) => 
  item.has_pending === true) || false;

const newOrder = {
  // ... outros campos
  has_pending_items: hasPendingItems
};
```

### 2. API de Busca (GET /api/orders)
- Retorna campos de pendência junto com outros dados
- Compatible com estrutura existente
- Suporte para filtros e paginação

### 3. API de Atualização (PUT /api/orders/[id])
- Atualiza campos de pendência durante edições
- Recalcula totais automaticamente
- Mantém consistência dos dados

## Exibição Visual

### 1. Interface do Usuário
- **Coluna "Pend."**: Posicionada entre # e Produto
- **Estilo Visual**: Círculo vermelho com número branco
- **Valor Vazio**: Hífen (-) quando não há pendências
- **Responsividade**: Adapta-se a diferentes tamanhos de tela

### 2. Geração de PDF
A coluna "Pend." é incluída em todos os PDFs gerados:

```typescript
<th class="text-center" style="width: 6%;">Pend.</th>
// ...
<td class="text-center" style="color: ${item.has_pending ? '#EF4444' : '#9CA3AF'};">
  ${item.has_pending && item.pending_quantity ? item.pending_quantity : '-'}
</td>
```

**Características do PDF:**
- Coluna com largura fixa de 6%
- Cor vermelha (#EF4444) para pendências ativas
- Cor cinza (#9CA3AF) para valores vazios
- Alinhamento centralizado

## Migração de Banco de Dados

### Arquivo: `020_add_pending_quantity_fields.sql`

```sql
-- Adicionar campos na tabela order_items
ALTER TABLE order_items 
ADD COLUMN pending_quantity INTEGER DEFAULT 0,
ADD COLUMN has_pending BOOLEAN DEFAULT FALSE;

-- Adicionar campo na tabela orders
ALTER TABLE orders 
ADD COLUMN has_pending_items BOOLEAN DEFAULT FALSE;

-- Comentários para documentação
COMMENT ON COLUMN order_items.pending_quantity IS 'Quantidade pendente quando excede estoque disponível';
COMMENT ON COLUMN order_items.has_pending IS 'Flag indicando se este item tem quantidade pendente';
COMMENT ON COLUMN orders.has_pending_items IS 'Flag indicando se o pedido possui itens com pendências';

-- Trigger para sincronização automática
CREATE OR REPLACE FUNCTION update_order_pending_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Atualizar has_pending_items no pedido baseado nos itens
  UPDATE orders 
  SET has_pending_items = EXISTS(
    SELECT 1 FROM order_items 
    WHERE order_id = NEW.order_id 
    AND has_pending = TRUE
  )
  WHERE id = NEW.order_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_order_pending_status
  AFTER INSERT OR UPDATE ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION update_order_pending_status();
```

## Fluxo de Trabalho

### 1. Adição de Produto
1. Usuário seleciona produto e quantidade
2. Sistema verifica estoque disponível
3. Se quantidade > estoque:
   - `quantity` = estoque disponível
   - `pending_quantity` = quantidade solicitada - disponível
   - `has_pending` = true
4. Item é adicionado com informações de pendência

### 2. Salvamento do Pedido
1. Frontend envia dados incluindo campos de pendência
2. API calcula se pedido tem itens pendentes
3. Dados são persistidos no banco
4. Trigger atualiza status do pedido automaticamente

### 3. Visualização
1. Interface carrega dados com pendências
2. Coluna "Pend." é exibida na tabela
3. PDFs incluem informações de pendência
4. Usuário visualiza situação completa do pedido

## Benefícios do Sistema

### 1. Controle de Estoque
- **Prevenção de Overselling**: Nunca vende mais que o disponível
- **Visibilidade**: Clara separação entre disponível e pendente
- **Rastreabilidade**: Histórico completo de pendências

### 2. Experiência do Usuário
- **Automático**: Não requer intervenção manual
- **Visual**: Identificação imediata de pendências
- **Completo**: Informações em todas as interfaces

### 3. Gestão Comercial
- **Controle**: Gerenciamento eficiente de pedidos parciais
- **Relatórios**: Dados para análise de demanda vs. estoque
- **Flexibilidade**: Permite confirmar parte do pedido imediatamente

## Casos de Uso

### Caso 1: Produto com Estoque Suficiente
- Estoque: 50 unidades
- Solicitado: 20 unidades
- **Resultado**: Qtd = 20, Pend = - (sem pendência)

### Caso 2: Produto com Estoque Insuficiente
- Estoque: 8 unidades
- Solicitado: 15 unidades
- **Resultado**: Qtd = 8, Pend = 7

### Caso 3: Produto sem Estoque
- Estoque: 0 unidades
- Solicitado: 10 unidades
- **Resultado**: Qtd = 0, Pend = 10

### Caso 4: Adição em Lote
- Múltiplos produtos com estoques variados
- Cada item processado individualmente
- Resultado consolidado no pedido

## Manutenção e Troubleshooting

### Verificar Dados de Pendência
```sql
-- Verificar itens com pendência
SELECT oi.*, p.product, p.stock 
FROM order_items oi
JOIN products p ON oi.product_id = p.id
WHERE oi.has_pending = true;

-- Verificar pedidos com pendências
SELECT o.order_number, o.has_pending_items, COUNT(oi.id) as total_pending_items
FROM orders o
JOIN order_items oi ON o.id = oi.order_id
WHERE o.has_pending_items = true AND oi.has_pending = true
GROUP BY o.id, o.order_number, o.has_pending_items;
```

### Reprocessar Pendências (se necessário)
```sql
-- Recalcular has_pending_items para todos os pedidos
UPDATE orders 
SET has_pending_items = EXISTS(
  SELECT 1 FROM order_items 
  WHERE order_id = orders.id 
  AND has_pending = TRUE
);
```

## Conclusão

O Sistema de Pendências proporciona controle automático e eficiente do estoque, garantindo que:
- Nunca se venda mais do que está disponível
- Pendências sejam claramente identificadas
- Usuários tenham visibilidade completa da situação
- Dados sejam consistentes em toda a aplicação

A implementação é robusta, automatizada e integrada em todos os pontos de contato do sistema, desde a adição de produtos até a geração de relatórios em PDF.