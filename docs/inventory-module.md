# Módulo de Inventário

O módulo de inventário é responsável pela gestão completa de produtos e suas equivalências, seguindo os princípios da Clean Architecture.

## 📁 Estrutura

```
src/modules/inventory/
├── domain/
│   ├── entities/
│   │   ├── product.entity.ts                    # Entidade de produto
│   │   ├── equivalence.entity.ts                # Entidade de equivalência
│   │   └── product-with-equivalences.entity.ts  # Produto com equivalências
│   └── repositories/
│       ├── product.repository.ts                # Interface do repositório de produtos
│       └── equivalence.repository.ts           # Interface do repositório de equivalências
├── application/
│   ├── dtos/
│   │   ├── product.dto.ts                       # DTOs de produto
│   │   └── equivalence.dto.ts                   # DTOs de equivalência
│   ├── queries/
│   │   ├── get-all-products.query.ts            # Query para listar produtos
│   │   └── search-products.query.ts             # Query para buscar produtos
│   └── use-cases/
│       ├── get-all-products.use-case.ts         # Caso de uso: listar produtos
│       └── search-products-with-equivalences.use-case.ts # Busca com equivalências
└── infrastructure/
    └── repositories/
        ├── supabase-product.repository.ts       # Implementação Supabase - Produtos
        └── supabase-equivalence.repository.ts   # Implementação Supabase - Equivalências
```

## 🏛️ Camada de Domínio

### Entidades

#### ProductEntity
Representa um produto no domínio com suas regras de negócio:

```typescript
interface Product {
  id: ID
  product: string      // Nome/código do produto
  stock: number        // Quantidade em estoque
  price: number        // Preço unitário
  application?: string // Aplicação/uso do produto
  createdAt: Date
  updatedAt?: Date
}
```

**Métodos de Negócio:**
- `isInStock()`: Verifica se há estoque disponível
- `isLowStock(threshold)`: Verifica se estoque está baixo
- `getFormattedPrice()`: Preço formatado em BRL
- `getStockStatus()`: Status do estoque (high/medium/low/out)
- `matchesSearch(query)`: Match para busca por termo

**Validações:**
- Nome do produto não pode estar vazio
- Preço não pode ser negativo
- Estoque não pode ser negativo

#### EquivalenceEntity
Representa uma equivalência entre códigos de produtos:

```typescript
interface Equivalence {
  id: string | number
  productCode: string      // Código do produto principal
  equivalentCode: string   // Código equivalente
  createdAt: Date
  updatedAt: Date
}
```

#### ProductWithEquivalencesEntity
Combina produto com suas equivalências para busca integrada:

```typescript
interface ProductWithEquivalences extends Product {
  equivalences: Equivalence[]
}
```

### Repositórios (Interfaces)

#### ProductRepository
Interface para operações com produtos:
```typescript
interface ProductRepository {
  findAll(params: PaginationParams): Promise<PaginatedResult<Product>>
  findById(id: ID): Promise<Product | null>
  search(query: string, params: PaginationParams): Promise<PaginatedResult<Product>>
  create(product: CreateProductData): Promise<Product>
  update(id: ID, data: UpdateProductData): Promise<Product>
  delete(id: ID): Promise<void>
  bulkImport(products: CreateProductData[]): Promise<ImportResult>
}
```

#### EquivalenceRepository
Interface para operações com equivalências:
```typescript
interface EquivalenceRepository {
  findAll(params: PaginationParams): Promise<PaginatedResult<Equivalence>>
  findByProductCode(code: string): Promise<Equivalence[]>
  findByEquivalentCode(code: string): Promise<Equivalence[]>
  create(equivalence: CreateEquivalenceData): Promise<Equivalence>
  bulkImport(equivalences: CreateEquivalenceData[]): Promise<ImportResult>
}
```

## 🔄 Camada de Aplicação

### DTOs (Data Transfer Objects)

#### ProductDTO
```typescript
interface ProductDTO {
  id: string
  product: string
  stock: number
  price: number
  application?: string
  formattedPrice: string
  stockStatus: 'high' | 'medium' | 'low' | 'out'
  createdAt: string
  updatedAt?: string
}
```

#### EquivalenceDTO
```typescript
interface EquivalenceDTO {
  id: string
  productCode: string
  equivalentCode: string
  createdAt: string
  updatedAt: string
}
```

### Queries

#### GetAllProductsQuery
Query para listagem paginada de produtos:
```typescript
interface GetAllProductsQuery {
  page?: number
  limit?: number
  sortBy?: 'product' | 'stock' | 'price' | 'createdAt'
  sortOrder?: 'asc' | 'desc'
}
```

#### SearchProductsQuery
Query para busca de produtos:
```typescript
interface SearchProductsQuery extends GetAllProductsQuery {
  q: string                    // Termo de busca
  includeEquivalences?: boolean // Incluir busca em equivalências
  stockFilter?: 'all' | 'inStock' | 'lowStock' | 'outOfStock'
  priceRange?: {
    min?: number
    max?: number
  }
}
```

### Casos de Uso

#### GetAllProductsUseCase
Lista todos os produtos com paginação:
```typescript
execute(query: GetAllProductsQuery): Promise<Result<PaginatedResult<ProductDTO>>>
```

**Responsabilidades:**
- Validar parâmetros de paginação
- Aplicar ordenação
- Converter entidades para DTOs
- Retornar resultado paginado

#### SearchProductsWithEquivalencesUseCase
Busca produtos incluindo equivalências:
```typescript
execute(query: SearchProductsQuery): Promise<Result<PaginatedResult<ProductDTO>>>
```

**Fluxo:**
1. Buscar produtos que correspondem ao termo
2. Buscar equivalências que correspondem ao termo
3. Encontrar produtos relacionados às equivalências
4. Combinar resultados únicos
5. Aplicar filtros adicionais
6. Paginar e retornar

## 🏭 Camada de Infraestrutura

### Repositórios (Implementações)

#### SupabaseProductRepository
Implementação usando Supabase:

```typescript
class SupabaseProductRepository implements ProductRepository {
  async findAll(params: PaginationParams): Promise<PaginatedResult<Product>> {
    const { data, error, count } = await this.supabase
      .from('products')
      .select('*', { count: 'exact' })
      .order(params.sortBy || 'created_at', { ascending: params.sortOrder === 'asc' })
      .range(params.offset, params.offset + params.limit - 1)
    
    if (error) throw new Error(error.message)
    
    return {
      data: data.map(row => ProductEntity.fromDatabase(row)),
      total: count || 0,
      page: params.page,
      limit: params.limit
    }
  }
  
  // ... outras implementações
}
```

**Funcionalidades:**
- Queries otimizadas com índices
- Paginação eficiente
- Busca full-text
- Importação em lote
- Transações para consistência

#### SupabaseEquivalenceRepository
Implementação para equivalências:

```typescript
class SupabaseEquivalenceRepository implements EquivalenceRepository {
  async findByProductCode(code: string): Promise<Equivalence[]> {
    const { data, error } = await this.supabase
      .from('equivalences')
      .select('*')
      .or(`product_code.eq.${code},equivalent_code.eq.${code}`)
    
    if (error) throw new Error(error.message)
    
    return data.map(row => EquivalenceEntity.fromDatabase(row))
  }
  
  // ... outras implementações
}
```

## 🔍 Funcionalidades de Busca

### Busca Simples
- Busca por nome/código do produto
- Busca por aplicação
- Case-insensitive
- Busca parcial (LIKE)

### Busca Avançada
- Busca em produtos + equivalências
- Filtros por estoque
- Filtros por faixa de preço
- Ordenação múltipla
- Paginação otimizada

### Algoritmo de Busca com Equivalências
```typescript
async searchWithEquivalences(query: string): Promise<Product[]> {
  // 1. Buscar produtos diretos
  const directMatches = await this.searchProducts(query)
  
  // 2. Buscar equivalências que correspondem
  const equivalences = await this.searchEquivalences(query)
  
  // 3. Encontrar produtos relacionados às equivalências
  const relatedProducts = await this.findProductsByEquivalences(equivalences)
  
  // 4. Combinar e remover duplicatas
  const allProducts = [...directMatches, ...relatedProducts]
  return this.removeDuplicates(allProducts)
}
```

## 📊 Importação de Dados

### Importação de Produtos via CSV
Suporte para importação em lote:

```typescript
interface ImportProductData {
  product: string
  stock?: number
  price?: number
  application?: string
}

interface ImportResult {
  success: number
  errors: ImportError[]
  warnings: ImportWarning[]
}
```

**Validações na Importação:**
- Formato de dados
- Produtos duplicados
- Valores numéricos válidos
- Campos obrigatórios

### Importação de Equivalências via CSV
```typescript
interface ImportEquivalenceData {
  productCode: string
  equivalentCode: string
}
```

**Validações:**
- Códigos não vazios
- Equivalências duplicadas
- Autoreferência (produto equivalente a si mesmo)

## 💰 Calculadora de Desconto

A partir da versão atual, o módulo de inventário inclui uma funcionalidade de **Calculadora de Desconto** integrada à tabela de produtos, permitindo calcular preços com desconto de forma rápida e visual.

### Funcionalidade

#### Localização
- **Componente**: `presentation/components/products/ProductsTable.tsx`
- **Ícone**: Calculadora (🧮) ao lado do preço de cada produto
- **Ativação**: Clique no ícone da calculadora

#### Características
- **Preço unitário**: Calcula desconto no preço individual do produto
- **Seleção de desconto**: Lista todos os descontos ativos do banco de dados
- **Cálculo em tempo real**: Atualização automática conforme seleção
- **Interface limpa**: Modal focada apenas no essencial

### Interface da Modal

#### Estrutura da Modal
```typescript
interface DiscountCalculatorModal {
  selectedProduct: ProductWithEquivalences  // Produto selecionado
  selectedDiscountId: string                // ID do desconto selecionado
  originalPrice: number                     // Preço original do produto
  discountPercentage: number                // Percentual de desconto
  discountAmount: number                    // Valor do desconto
  finalPrice: number                        // Preço final com desconto
}
```

#### Elementos da Interface
1. **Card do Produto**
   - Nome do produto
   - Aplicação (se houver)
   - Estoque atual
   - Preço original

2. **Seleção de Desconto**
   - Dropdown com todos os descontos ativos
   - Placeholder: "Sem desconto - Clique para selecionar"
   - Botão "Limpar" (aparece quando desconto selecionado)

3. **Resumo do Cálculo**
   - Preço original
   - Desconto aplicado (valor e percentual)
   - **Preço final** (destacado)
   - Badge de economia (quando há desconto)

### Integração com Descontos

#### API de Descontos
```typescript
// Busca descontos ativos
const { data: discountsResponse } = useQuery({
  queryKey: ['discounts', 'active'],
  queryFn: async () => {
    const response = await fetch('/api/discounts?active=true')
    return response.json()
  }
})
```

#### Estrutura do Desconto
```typescript
interface Discount {
  id: string
  name: string                    // Nome do desconto
  discount_percentage: number     // Percentual de desconto
  commission_percentage?: number  // Comissão associada (opcional)
}
```

### Algoritmo de Cálculo

#### Função de Cálculo
```typescript
const calculateDiscount = () => {
  if (!selectedProduct) return { 
    originalPrice: 0, 
    discountAmount: 0, 
    finalPrice: 0, 
    discountPercentage: 0 
  }

  const originalPrice = selectedProduct.price
  let discountPercentage = 0
  
  if (selectedDiscountId) {
    const discount = discounts.find(d => d.id === selectedDiscountId)
    if (discount) {
      discountPercentage = parseFloat(discount.discount_percentage.toString()) || 0
    }
  }

  const discountAmount = (originalPrice * discountPercentage) / 100
  const finalPrice = originalPrice - discountAmount

  return { originalPrice, discountAmount, finalPrice, discountPercentage }
}
```

#### Fórmulas
- **Valor do Desconto**: `preço_original × (percentual_desconto ÷ 100)`
- **Preço Final**: `preço_original - valor_desconto`
- **Economia**: `valor_desconto`

### Estados da Interface

#### Estado Inicial
- Modal fechada
- Sem produto selecionado
- Sem desconto selecionado

#### Estado com Produto Selecionado
- Modal aberta
- Produto carregado
- Desconto em branco (placeholder visível)
- Preço original mostrado

#### Estado com Desconto Aplicado
- Desconto selecionado
- Cálculo atualizado em tempo real
- Resumo completo visível
- Badge de economia mostrado

### Casos de Uso

#### 1. Consulta Rápida de Preço
**Cenário**: Vendedor quer mostrar preço com desconto ao cliente
**Fluxo**:
1. Busca produto na tabela
2. Clica no ícone da calculadora
3. Seleciona desconto aplicável
4. Mostra preço final ao cliente

#### 2. Comparação de Descontos
**Cenário**: Vendedor quer comparar diferentes descontos
**Fluxo**:
1. Abre calculadora para um produto
2. Testa desconto A
3. Usa botão "Limpar" e testa desconto B
4. Compara valores finais

#### 3. Verificação de Economia
**Cenário**: Cliente quer saber quanto economizará
**Fluxo**:
1. Aplica desconto na calculadora
2. Badge mostra economia total
3. Demonstra valor poupado

### Melhorias e Considerações

#### Pontos Positivos
- ✅ **Interface simples**: Foca apenas no essencial
- ✅ **Cálculo em tempo real**: Resposta imediata
- ✅ **Integração nativa**: Parte da tabela de produtos
- ✅ **Reutilização**: Aproveita sistema de descontos existente
- ✅ **UX intuitiva**: Botões e placeholders claros

#### Possíveis Melhorias Futuras
- 📈 **Histórico de cálculos**: Guardar cálculos recentes
- 📊 **Múltiplos produtos**: Calcular desconto para lista
- 💾 **Salvar configuração**: Lembrar último desconto usado
- 📱 **Responsividade**: Otimizar para mobile
- 🎨 **Temas visuais**: Diferentes estilos de apresentação

## 🧪 Como Usar

### Hook de Produtos
```typescript
// presentation/hooks/useProducts.ts
import { useProducts } from '@/presentation/hooks/useProducts'

function ProductsPage() {
  const { 
    products, 
    isLoading, 
    error, 
    pagination,
    nextPage,
    prevPage 
  } = useProducts({
    page: 1,
    limit: 20,
    sortBy: 'product'
  })
  
  if (isLoading) return <ProductsTableSkeleton />
  if (error) return <ErrorMessage error={error} />
  
  return (
    <ProductsTable 
      products={products}
      pagination={pagination}
      onNextPage={nextPage}
      onPrevPage={prevPage}
    />
  )
}
```

### Hook de Busca
```typescript
// presentation/hooks/useProductSearch.ts
import { useProductSearch } from '@/presentation/hooks/useProductSearch'

function ProductSearchForm() {
  const [query, setQuery] = useState('')
  const { 
    searchResults, 
    isSearching, 
    search 
  } = useProductSearch()
  
  const handleSearch = () => {
    search({
      q: query,
      includeEquivalences: true,
      stockFilter: 'inStock'
    })
  }
  
  return (
    <div>
      <input 
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
      />
      <SearchResults results={searchResults} loading={isSearching} />
    </div>
  )
}
```

## 📈 Performance e Otimizações

### Índices de Database
```sql
-- Índices para busca otimizada
CREATE INDEX idx_products_search ON products USING gin(to_tsvector('portuguese', product || ' ' || COALESCE(application, '')));
CREATE INDEX idx_products_stock ON products(stock) WHERE stock > 0;
CREATE INDEX idx_equivalences_codes ON equivalences(product_code, equivalent_code);
```

### Cache de Queries
- React Query para cache de dados
- Invalidação inteligente
- Background refetch
- Optimistic updates

### Paginação Eficiente
- Cursor-based pagination para grandes datasets
- Contagem aproximada para melhor performance
- Lazy loading de dados relacionados

## 🛠️ Configuração

### Variáveis de Ambiente
```env
# Configurações de paginação
NEXT_PUBLIC_DEFAULT_PAGE_SIZE=20
NEXT_PUBLIC_MAX_PAGE_SIZE=100

# Configurações de busca
NEXT_PUBLIC_SEARCH_DEBOUNCE_MS=300
NEXT_PUBLIC_ENABLE_FUZZY_SEARCH=true
```

### Configuração de Índices
Execute os scripts de migração em `/migrations/` para criar os índices necessários para performance otimizada.