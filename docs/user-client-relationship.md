# Relacionamento Usuário-Cliente e Isolamento de Dados

## 🔗 Visão Geral

O sistema implementa um modelo multi-tenant onde cada cliente pertence a um usuário específico, garantindo isolamento de dados e controle de acesso granular.

## 👥 Modelo de Relacionamento

### Estrutura Hierárquica
```
🏢 Sistema
├── 👤 Usuário Admin (vê todos os clientes)
├── 👤 Usuário A (vê apenas seus clientes)
│   ├── 🏪 Cliente 001
│   ├── 🏪 Cliente 002
│   └── 🏪 Cliente 003
└── 👤 Usuário B (vê apenas seus clientes)
    ├── 🏪 Cliente 004
    ├── 🏪 Cliente 005
    └── 🏪 Cliente 006
```

### Relacionamento no Banco de Dados
```sql
-- Tabela de usuários
custom_users {
  id: UUID (PK)
  name: VARCHAR
  is_admin: BOOLEAN
  active: BOOLEAN
}

-- Tabela de clientes
clients {
  id: UUID (PK)
  code: VARCHAR(20) UNIQUE
  client: VARCHAR(255)
  city: VARCHAR(100) 
  cnpj: VARCHAR(14) UNIQUE
  user_id: UUID (FK -> custom_users.id)  -- Chave de relacionamento
  created_at: TIMESTAMPTZ
  updated_at: TIMESTAMPTZ
}
```

## 🔒 Controle de Acesso

### Regras de Visibilidade

#### Usuários Administradores
- ✅ **Visualizam** todos os clientes do sistema
- ✅ **Importam** clientes para qualquer usuário
- ✅ **Gerenciam** dados de todos os usuários
- ✅ **Acesso total** sem restrições

#### Usuários Normais
- ✅ **Visualizam** apenas clientes atribuídos a eles
- ❌ **Não veem** clientes de outros usuários
- ❌ **Não importam** clientes (função restrita a admins)
- ✅ **Buscam** apenas dentro de seus próprios dados

### Implementação do Filtro
```typescript
// Aplicado em todas as consultas no repository
const userId = await this.getCurrentUserId()
const currentUser = SessionManager.getCurrentUser()

let query = supabase.from("clients").select("*")

// Filtro automático por usuário (exceto admins)
if (!currentUser?.is_admin) {
  query = query.eq('user_id', userId)
}
```

## 🛠️ Implementação Técnica

### Abordagem Escolhida: Filtros no Código
Inicialmente tentamos usar Row Level Security (RLS) do Supabase, mas enfrentamos problemas de persistência de contexto. A solução final usa **filtros explícitos no código**.

#### ❌ RLS (Tentativa Inicial)
```sql
-- Problemas encontrados:
-- 1. set_config() não persiste entre chamadas RPC
-- 2. Contexto de usuário não se mantém
-- 3. Políticas bloqueavam acesso mesmo para admins

-- Tentativa que falhou:
CREATE POLICY "users_see_own_clients" ON clients
FOR ALL USING (user_id = get_current_user_id());
```

#### ✅ Filtros no Código (Solução Final)
```typescript
// Implementado no SupabaseClientRepository
private async applyUserFilter(query: any, userId: string) {
  const currentUser = SessionManager.getCurrentUser()
  
  // Admin vê todos, usuário normal apenas os seus
  if (!currentUser?.is_admin) {
    return query.eq('user_id', userId)
  }
  
  return query
}
```

### Pontos de Aplicação do Filtro

#### 1. Listagem de Clientes
```typescript
async findAll(options?: PaginationOptions) {
  const userId = await this.getCurrentUserId()
  const currentUser = SessionManager.getCurrentUser()
  
  let query = supabase.from("clients").select("*")
  
  if (!currentUser?.is_admin) {
    query = query.eq('user_id', userId)
  }
  
  return query
}
```

#### 2. Busca de Clientes
```typescript
async search(query: string, page = 1, pageSize = 50) {
  const userId = await this.getCurrentUserId()
  const currentUser = SessionManager.getCurrentUser()
  
  let searchQuery = supabase.from("clients")
    .select("*")
    .or(`code.ilike.%${query}%,client.ilike.%${query}%`)
  
  if (!currentUser?.is_admin) {
    searchQuery = searchQuery.eq('user_id', userId)
  }
  
  return searchQuery
}
```

#### 3. Busca por ID
```typescript
async findById(id: string) {
  const userId = await this.getCurrentUserId()
  const currentUser = SessionManager.getCurrentUser()
  
  let query = supabase.from("clients").select("*").eq("id", id)
  
  if (!currentUser?.is_admin) {
    query = query.eq('user_id', userId)
  }
  
  return query.single()
}
```

## 🔄 Fluxo de Importação

### Atribuição de Usuário
Durante a importação, os clientes são atribuídos ao usuário selecionado:

```typescript
// No componente ClientCSVImport
const [selectedUserId, setSelectedUserId] = useState<string>("")

// Cada cliente importado recebe o user_id selecionado
const validRows = clientsData.map(client => ({
  ...client,
  user_id: selectedUserId  // Vinculação obrigatória
}))
```

### Processo de Vinculação
1. **Admin seleciona** usuário responsável na interface
2. **Sistema valida** que usuário existe e está ativo
3. **Importação vincula** todos os clientes ao usuário selecionado
4. **Usuário final** passa a ver apenas seus clientes

## 🗂️ Cache e Performance

### Isolamento no Cache
O cache é isolado por usuário usando `queryKey` específicas:

```typescript
// Hook useClients
export const useClients = (options: ClientsOptions = {}) => {
  const { user } = useAuth()
  
  return useQuery({
    queryKey: ["clients", user?.id, options.page],  // Cache por usuário
    queryFn: async () => {
      return await clientRepository.findAll(options)
    }
  })
}

// Hook useClientSearch  
export const useClientSearch = (options: SearchOptions) => {
  const { user } = useAuth()
  
  return useQuery({
    queryKey: ["clients", "search", user?.id, options.query],  // Cache por usuário
    queryFn: async () => {
      return await clientRepository.search(options.query)
    }
  })
}
```

### Invalidação de Cache
```typescript
// Quando dados mudam, cache é invalidado apenas para o usuário
queryClient.invalidateQueries(["clients", user?.id])
```

## 🛡️ Segurança

### Validações de Segurança
1. **Autenticação obrigatória** - SessionManager verifica token
2. **Autorização por operação** - Admin para importação
3. **Filtros automáticos** - Aplicados em todas as consultas
4. **Validação de usuário** - Existe e está ativo
5. **Sanitização de dados** - Limpeza de CNPJ e códigos

### Pontos de Proteção
```typescript
// 1. Verificação de autenticação
private async getCurrentUserId(): Promise<ID> {
  const user = SessionManager.getCurrentUser()
  if (!user) {
    throw new Error("User not authenticated")
  }
  return user.id
}

// 2. Verificação de admin para importação
useEffect(() => {
  if (!user?.is_admin) {
    router.push("/clients")  // Redireciona não-admins
  }
}, [user, router])

// 3. Validação no backend
if (!clients || !Array.isArray(clients)) {
  return NextResponse.json({ error: "Dados de clientes inválidos" }, { status: 400 })
}
```

## 📊 Cenários de Uso

### Cenário 1: Usuário Normal
```
👤 João (Usuário Normal)
├── Acessa /clients
├── Vê apenas: Cliente A, Cliente B, Cliente C
├── Busca por "Exemplo" 
└── Retorna apenas clientes do João que contenham "Exemplo"
```

### Cenário 2: Administrador
```
👤 Admin (Administrador)  
├── Acessa /clients
├── Vê todos: Cliente A, B, C, D, E, F (de todos os usuários)
├── Acessa /products/import (aba Clientes)
├── Seleciona usuário "Maria" para vincular importação
└── Importa 100 clientes para Maria
```

### Cenário 3: Importação
```
📥 Processo de Importação
├── Admin seleciona arquivo com 500 clientes
├── Admin seleciona "Usuário Pedro" como responsável
├── Sistema processa e valida dados
├── 500 clientes ficam vinculados a Pedro
└── Pedro vê apenas esses 500 clientes quando logar
```

## 🔧 Manutenção

### Transferir Clientes Entre Usuários
```sql
-- Para transferir clientes entre usuários (via SQL direto)
UPDATE clients 
SET user_id = 'novo-usuario-uuid', 
    updated_at = NOW()
WHERE user_id = 'usuario-origem-uuid'
  AND code IN ('001', '002', '003');
```

### Verificar Distribuição de Clientes
```sql
-- Ver quantos clientes cada usuário tem
SELECT 
  u.name as usuario,
  COUNT(c.id) as total_clientes,
  u.is_admin
FROM custom_users u
LEFT JOIN clients c ON c.user_id = u.id
WHERE u.active = true
GROUP BY u.id, u.name, u.is_admin
ORDER BY total_clientes DESC;
```

### Clientes Órfãos
```sql
-- Identificar clientes sem usuário válido
SELECT c.code, c.client, c.user_id
FROM clients c
LEFT JOIN custom_users u ON u.id = c.user_id
WHERE u.id IS NULL OR u.active = false;
```

## 📈 Métricas e Monitoramento

### Queries de Monitoramento
```sql
-- Total de clientes por usuário
SELECT user_id, COUNT(*) as total FROM clients GROUP BY user_id;

-- Clientes criados por período
SELECT DATE(created_at) as data, COUNT(*) as novos_clientes 
FROM clients 
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at);

-- Usuários mais ativos
SELECT u.name, COUNT(c.id) as clientes_cadastrados
FROM custom_users u
JOIN clients c ON c.user_id = u.id
GROUP BY u.id, u.name
ORDER BY clientes_cadastrados DESC;
```

## 🎯 Benefícios da Abordagem

### ✅ Vantagens
1. **Isolamento completo** de dados entre usuários
2. **Performance otimizada** com filtros automáticos
3. **Controle granular** de permissões
4. **Cache isolado** por usuário
5. **Segurança robusta** em todas as camadas
6. **Flexibilidade** para admins gerenciarem todos os dados

### 🔄 Flexibilidade
- Administradores podem ver dados de todos
- Fácil transferência de clientes entre usuários
- Importação controlada com atribuição específica
- Auditoria completa com timestamps

---

**Implementação**: Clean Architecture com filtros explícitos  
**Segurança**: Múltiplas camadas de validação  
**Performance**: Cache isolado e queries otimizadas  
**Última atualização**: 13/06/2025