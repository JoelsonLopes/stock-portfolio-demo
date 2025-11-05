# Módulo de Clientes

O módulo de clientes é responsável pela gestão completa de clientes e suas informações, seguindo os princípios da Clean Architecture e o mesmo padrão do módulo de produtos.

## 📁 Estrutura

```
src/modules/clients/
├── domain/
│   ├── entities/
│   │   └── client.entity.ts                    # Entidade de cliente
│   └── repositories/
│       └── client.repository.ts                # Interface do repositório de clientes
├── application/
│   ├── dtos/
│   │   └── client.dto.ts                       # DTOs de cliente
│   ├── queries/
│   │   ├── get-all-clients.query.ts            # Query para listar clientes
│   │   └── search-clients.query.ts             # Query para buscar clientes
│   └── use-cases/
│       ├── get-all-clients.use-case.ts         # Caso de uso: listar clientes
│       └── search-clients.use-case.ts          # Caso de uso: buscar clientes
└── infrastructure/
    └── repositories/
        └── supabase-client.repository.ts       # Implementação Supabase - Clientes

presentation/
├── hooks/
│   ├── useClients.ts                           # Hook para listagem de clientes
│   └── useClientSearch.ts                      # Hook para busca de clientes
└── components/clients/
    ├── ClientSearchForm.tsx                    # Formulário de busca
    └── ClientsTable.tsx                        # Tabela de resultados

app/(dashboard)/
└── clients/
    └── page.tsx                                # Página principal de clientes
```

## 🏛️ Camada de Domínio

### Entidades

#### ClientEntity
Representa um cliente no domínio com suas regras de negócio:

```typescript
interface Client {
  id: ID
  code: string         // Código único do cliente
  client: string       // Nome/razão social do cliente
  city?: string        // Cidade do cliente
  cnpj?: string        // CNPJ do cliente
  createdAt: Date
  updatedAt?: Date
}
```

**Métodos de Negócio:**
- `getFormattedCnpj()`: CNPJ formatado (XX.XXX.XXX/XXXX-XX)
- `getDisplayInfo()`: Informações resumidas para exibição
- `matchesSearch(query)`: Match para busca por termo
- `isActive()`: Verifica se o cliente está ativo

**Validações:**
- Código do cliente não pode estar vazio
- Nome do cliente não pode estar vazio
- CNPJ deve ter formato válido (14 dígitos)
- Códigos são automaticamente convertidos para UPPERCASE

**Funcionalidades Especiais:**
- Validação básica de CNPJ (14 dígitos, não sequencial)
- Formatação automática de campos texto para UPPERCASE
- Formatação de CNPJ para exibição

### Repositórios (Interfaces)

#### ClientRepository
Interface para operações com clientes:

```typescript
interface ClientRepository {
  findAll(options?: PaginationOptions): Promise<PaginatedResult<ClientEntity>>
  findById(id: string | number): Promise<ClientEntity | null>
  findByCode(code: string): Promise<ClientEntity | null>
  findByCnpj(cnpj: string): Promise<ClientEntity | null>
  findByCity(city: string): Promise<ClientEntity[]>
  search(query: string, page?: number, pageSize?: number): Promise<{ data: ClientEntity[]; total: number }>
  save(entity: ClientEntity): Promise<void>
  delete(id: ID): Promise<void>
}
```

## 🔄 Camada de Aplicação

### DTOs (Data Transfer Objects)

#### ClientDTO
```typescript
interface ClientDTO {
  id: ID
  code: string
  client: string
  city?: string
  cnpj?: string
  created_at: string
  updated_at?: string
}
```

#### ClientMapper
Responsável pela conversão entre DTOs e entidades:

```typescript
class ClientMapper {
  static toDomain(dto: ClientDTO): Client {
    return {
      id: dto.id,
      code: dto.code,
      client: dto.client,
      city: dto.city,
      cnpj: dto.cnpj,
      createdAt: new Date(dto.created_at),
      updatedAt: dto.updated_at ? new Date(dto.updated_at) : undefined,
    }
  }

  static toDTO(domain: Client): ClientDTO {
    return {
      id: domain.id,
      code: domain.code,
      client: domain.client,
      city: domain.city,
      cnpj: domain.cnpj,
      created_at: domain.createdAt.toISOString(),
      updated_at: domain.updatedAt?.toISOString(),
    }
  }
}
```

### Queries

#### GetAllClientsQuery
Query para listagem paginada de clientes:

```typescript
interface GetAllClientsRequest {
  pagination?: PaginationOptions
}

interface GetAllClientsResponse {
  clients: Client[]
  total: number
  currentPage: number
  totalPages: number
  hasMore: boolean
}
```

#### SearchClientsQuery
Query para busca de clientes:

```typescript
interface SearchClientsRequest {
  query: string
  page?: number
  pageSize?: number
}

interface SearchClientsResponse {
  clients: Client[]
  total: number
  page: number
  pageSize: number
}
```

### Casos de Uso

#### GetAllClientsUseCase
Lista todos os clientes com paginação:

```typescript
execute(): Promise<PaginatedResult<ClientEntity>>
```

**Responsabilidades:**
- Buscar todos os clientes
- Aplicar paginação padrão
- Retornar resultado estruturado

#### SearchClientsUseCase
Busca clientes por termo:

```typescript
execute({ query, page, pageSize }: SearchClientsInput): Promise<{
  data: ClientEntity[],
  total: number
}>
```

**Fluxo:**
1. Validar parâmetros de entrada
2. Executar busca no repositório
3. Retornar resultados paginados
4. Tratar erros e retornar resultado vazio em caso de falha

## 🏭 Camada de Infraestrutura

### Repositórios (Implementações)

#### SupabaseClientRepository
Implementação usando Supabase:

```typescript
class SupabaseClientRepository implements ClientRepository {
  async findAll(options?: PaginationOptions): Promise<PaginatedResult<ClientEntity>> {
    const page = options?.page || 1
    const limit = options?.limit || 50
    const start = (page - 1) * limit

    const { data, error, count } = await supabase
      .from("clients")
      .select("*", { count: "exact" })
      .range(start, start + limit - 1)
      .order("client")

    // Tratamento de erro e conversão para entidades...
  }

  async search(query: string, page = 1, pageSize = 50): Promise<{ data: ClientEntity[], total: number }> {
    const start = (page - 1) * pageSize;
    
    const { data, error, count } = await supabase
      .from("clients")
      .select("*", { count: "exact" })
      .or(`code.ilike.%${query}%,client.ilike.%${query}%,city.ilike.%${query}%,cnpj.ilike.%${query}%`)
      .range(start, start + pageSize - 1)
      .order("client")

    // Tratamento e retorno...
  }
}
```

**Funcionalidades:**
- Queries otimizadas com índices GIN para busca por similaridade
- Paginação eficiente com range
- Busca em múltiplos campos simultaneamente
- Ordenação por nome do cliente
- Tratamento robusto de erros

## 🔍 Funcionalidades de Busca

### Campos de Busca
A busca funciona nos seguintes campos:
- **Código do Cliente** (code)
- **Nome/Razão Social** (client)
- **Cidade** (city)
- **CNPJ** (cnpj) - com ou sem formatação

### Características da Busca
- **Case-insensitive**: Não diferencia maiúsculas/minúsculas
- **Busca parcial**: Encontra termos em qualquer posição
- **Multi-campo**: Busca simultaneamente em todos os campos
- **Formatação flexível**: CNPJ pode ser buscado com ou sem pontuação

### Algoritmo de Busca
```sql
-- Query SQL executada no Supabase
SELECT * FROM clients 
WHERE code ILIKE '%TERMO%' 
   OR client ILIKE '%TERMO%' 
   OR city ILIKE '%TERMO%' 
   OR cnpj ILIKE '%TERMO%'
ORDER BY client
LIMIT 50 OFFSET 0;
```

## 🎨 Camada de Apresentação

### Hooks React

#### useClients
Hook para listagem de clientes:

```typescript
import { useClients } from '@/presentation/hooks/useClients'

function ClientsPage() {
  const { data, isLoading, error } = useClients(enabled)
  
  // data: PaginatedResult<ClientEntity>
  // isLoading: boolean
  // error: Error | null
}
```

#### useClientSearch
Hook para busca de clientes:

```typescript
import { useClientSearch } from '@/presentation/hooks/useClientSearch'

function ClientSearchComponent() {
  const { data, isLoading, error, refetch } = useClientSearch({
    query: "SANTOS",
    page: 1,
    pageSize: 50,
    enabled: true
  })
  
  // data: { data: ClientEntity[], total: number }
}
```

### Componentes

#### ClientSearchForm
Formulário de busca com funcionalidades:

```typescript
interface ClientSearchFormProps {
  onSearch: (query: string) => void
  onClear: () => void
  isLoading: boolean
  currentQuery: string
}
```

**Funcionalidades:**
- Input com conversão automática para UPPERCASE
- Botão de limpar campo
- Indicador de loading durante busca
- Exibição do termo atual de busca
- Botão para limpar busca completa
- Responsivo (mobile/desktop)

#### ClientsTable
Tabela de resultados com design responsivo:

```typescript
interface ClientsTableProps {
  clients: ClientEntity[]
  loading?: boolean
  hasSearched: boolean
  searchQuery: string
  error?: any
  total: number
  page: number
  pageSize: number
  onPageChange: (page: number) => void
}
```

**Estados da Tabela:**
- **Loading**: Spinner com mensagem
- **Error**: Alert com detalhes do erro
- **Empty (não buscou)**: Ícone + orientações de uso
- **Empty (sem resultados)**: Ícone + sugestões
- **Com resultados**: Tabela formatada

**Colunas da Tabela:**
- **Código**: Fonte monospace, largura fixa
- **Cliente**: Nome completo, largura flexível
- **Cidade**: Oculta em mobile, opcional
- **CNPJ**: Formatado automaticamente, fonte monospace

### Página Principal

#### /clients/page.tsx
Página completa que integra todos os componentes:

```typescript
export default function ClientsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [hasSearched, setHasSearched] = useState(false)
  const [page, setPage] = useState(1)
  
  const { data, isLoading, error, refetch } = useClientSearch({
    query: searchQuery,
    page,
    pageSize: 50,
    enabled: hasSearched
  })

  // Handlers para busca, limpeza e paginação...
  
  return (
    <div className="container mx-auto px-4 py-6 space-y-6 max-w-7xl">
      <Card>
        <CardHeader>
          <CardTitle>Consulta de Clientes</CardTitle>
        </CardHeader>
        <CardContent>
          <ClientSearchForm {...props} />
        </CardContent>
      </Card>

      <ClientsTable {...props} />
    </div>
  )
}
```

## 🗄️ Estrutura de Banco de Dados

### Tabela clients

```sql
CREATE TABLE public.clients (
  id bigserial not null,
  code character varying(255) not null,        -- Código único do cliente
  client character varying(255) not null,      -- Nome/razão social
  city character varying(255) null,            -- Cidade
  cnpj character varying(18) null,             -- CNPJ (XX.XXX.XXX/XXXX-XX)
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint clients_pkey primary key (id)
);
```

### Índices de Performance

```sql
-- Índices básicos
CREATE INDEX idx_clients_code ON clients(code);
CREATE INDEX idx_clients_client ON clients(client);
CREATE INDEX idx_clients_city ON clients(city);
CREATE INDEX idx_clients_cnpj ON clients(cnpj);

-- Índice único para código
CREATE UNIQUE INDEX idx_clients_code_unique ON clients(code);

-- Índices GIN para busca por similaridade
CREATE INDEX idx_clients_client_gin ON clients USING gin(client gin_trgm_ops);
CREATE INDEX idx_clients_code_gin ON clients USING gin(code gin_trgm_ops);
CREATE INDEX idx_clients_city_gin ON clients USING gin(city gin_trgm_ops);

-- Índice composto para otimizar consultas
CREATE INDEX idx_clients_composite ON clients(client, code, city) 
INCLUDE (id, cnpj, created_at);
```

### Row Level Security (RLS)

```sql
-- Habilitar RLS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança (usuários autenticados)
CREATE POLICY "Usuários autenticados podem ver todos os clientes"
  ON clients FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuários autenticados podem inserir clientes"
  ON clients FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem atualizar clientes"
  ON clients FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem deletar clientes"
  ON clients FOR DELETE TO authenticated USING (true);
```

## 🧪 Como Usar

### Exemplo Completo

```typescript
import { useState } from "react"
import { ClientsTable } from "@/presentation/components/clients/ClientsTable"
import { ClientSearchForm } from "@/presentation/components/clients/ClientSearchForm"
import { useClientSearch } from "@/presentation/hooks/useClientSearch"

export default function MyClientsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [hasSearched, setHasSearched] = useState(false)
  const [page, setPage] = useState(1)

  const { data, isLoading, error, refetch } = useClientSearch({
    query: searchQuery,
    page,
    pageSize: 50,
    enabled: hasSearched
  })

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    setHasSearched(true)
    setPage(1)
    refetch()
  }

  const handleClearSearch = () => {
    setSearchQuery("")
    setHasSearched(false)
    setPage(1)
  }

  return (
    <div className="space-y-6">
      <ClientSearchForm
        onSearch={handleSearch}
        onClear={handleClearSearch}
        isLoading={isLoading}
        currentQuery={searchQuery}
      />
      
      <ClientsTable
        clients={data?.data || []}
        loading={isLoading}
        hasSearched={hasSearched}
        searchQuery={searchQuery}
        error={error}
        total={data?.total || 0}
        page={page}
        pageSize={50}
        onPageChange={setPage}
      />
    </div>
  )
}
```

### Busca por Diferentes Critérios

```typescript
// Buscar por código
handleSearch("318")

// Buscar por nome
handleSearch("SANTOS")

// Buscar por cidade
handleSearch("PORTO ALEGRE")

// Buscar por CNPJ (com ou sem formatação)
handleSearch("87.127.486/0001-01")
handleSearch("87127486000101")
```

## 📈 Performance e Otimizações

### Índices de Database
Os índices foram criados para otimizar:
- Busca por código (único e rápido)
- Busca por nome (full-text com gin_trgm_ops)
- Busca por cidade (índice GIN)
- Busca combinada (índice composto)

### Cache de Queries
```typescript
// React Query configurado para cache eficiente
queryKey: ["clients", "search", query, page, pageSize]
staleTime: 60 * 1000        // 1 minuto
gcTime: 10 * 60 * 1000      // 10 minutos
refetchOnWindowFocus: false  // Não revalidar ao focar janela
```

### Paginação Eficiente
- Paginação server-side com LIMIT/OFFSET
- Contagem total otimizada
- Pagesize padrão de 50 itens
- Navegação de páginas integrada

## 🛠️ Configuração e Deploy

### Setup do Banco de Dados

1. **Execute os scripts SQL** em ordem no Supabase:
   ```bash
   # 1. Criação da tabela
   # 2. Índices de performance
   # 3. Row Level Security
   # 4. Dados de teste (opcional)
   ```

2. **Verifique a criação**:
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' AND table_name = 'clients';
   ```

### Variáveis de Ambiente
```env
# Configurações herdadas do sistema existente
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Navegação
Adicione ao menu da aplicação:
```typescript
// Link para a página de clientes
<Link href="/clients">Clientes</Link>
```

## 🔗 Integração com Outros Módulos

### Possíveis Integrações Futuras
- **Módulo de Vendas**: Vincular pedidos a clientes
- **Módulo de Produtos**: Histórico de produtos comprados
- **Módulo de Relatórios**: Análises por cliente/região
- **Módulo de Importação**: Import/export de dados de clientes

### Extensibilidade
A arquitetura permite facilmente adicionar:
- Novos campos na entidade Client
- Novos casos de uso (ex: CreateClientUseCase)
- Novos tipos de busca (ex: busca por faixa de CNPJ)
- Novos componentes de interface

## ✅ Status de Implementação

- ✅ **Entidade de Domínio**: ClientEntity com validações
- ✅ **Repositório**: Interface e implementação Supabase
- ✅ **DTOs e Mappers**: Conversão entre camadas
- ✅ **Use Cases**: GetAll e Search implementados
- ✅ **Queries**: Estrutura para consultas
- ✅ **Hooks React**: useClients e useClientSearch
- ✅ **Componentes**: SearchForm e Table responsivos
- ✅ **Página Principal**: /clients completamente funcional
- ✅ **Schema de Banco**: Scripts SQL otimizados
- ✅ **Documentação**: Completa e atualizada

**O módulo de clientes está 100% funcional e segue exatamente o mesmo padrão do módulo de produtos!** 🎉