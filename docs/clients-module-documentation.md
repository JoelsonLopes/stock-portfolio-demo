# Documentação do Módulo de Clientes

## 📋 Índice
- [Visão Geral](#visão-geral)
- [Arquitetura](#arquitetura)
- [Relacionamento Usuário-Cliente](#relacionamento-usuário-cliente)
- [Funcionalidades](#funcionalidades)
- [Importação em Massa](#importação-em-massa)
- [API Endpoints](#api-endpoints)
- [Estrutura de Arquivos](#estrutura-de-arquivos)
- [Como Usar](#como-usar)

## 🔍 Visão Geral

O módulo de clientes implementa um sistema completo de gestão de clientes seguindo os princípios da Clean Architecture. Cada cliente está vinculado a um usuário específico, garantindo isolamento de dados e controle de acesso.

### 🎯 Características Principais
- ✅ **Clean Architecture** - Separação clara de responsabilidades
- ✅ **Multi-tenant** - Isolamento por usuário
- ✅ **Importação em massa** - Suporte a arquivos CSV/TXT
- ✅ **Validação completa** - CNPJ, códigos únicos, campos obrigatórios
- ✅ **Busca avançada** - Por código, nome, cidade, CNPJ
- ✅ **Interface responsiva** - Funciona em desktop e mobile

## 🏗️ Arquitetura

### Camadas da Clean Architecture

```
📁 src/modules/clients/
├── 📁 domain/                    # Regras de negócio
│   ├── entities/                 # Entidades do domínio
│   └── repositories/            # Contratos dos repositórios
├── 📁 application/              # Casos de uso
│   └── use-cases/               # Lógica de aplicação
├── 📁 infrastructure/           # Implementações externas
│   └── repositories/            # Implementação Supabase
└── 📁 presentation/             # Interface do usuário
    ├── components/              # Componentes React
    └── hooks/                   # Hooks customizados
```

### Entidade Cliente

```typescript
interface ClientEntity {
  id?: ID
  code: string           // Código único do cliente
  client: string         // Nome do cliente
  city: string          // Cidade
  cnpj?: string | null  // CNPJ (14 dígitos, opcional)
  userId: ID            // ID do usuário responsável
  createdAt: Date
  updatedAt?: Date
}
```

## 👥 Relacionamento Usuário-Cliente

### Modelo de Dados
- Cada cliente pertence a **um único usuário** (`user_id`)
- Usuários **normais** veem apenas seus próprios clientes
- Usuários **administradores** veem todos os clientes
- **RLS desabilitado** - filtros implementados no código

### Controle de Acesso
```typescript
// Filtro aplicado em todas as consultas
if (!currentUser?.is_admin) {
  query = query.eq('user_id', userId)
}
```

### Schema do Banco
```sql
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) UNIQUE NOT NULL,
  client VARCHAR(255) NOT NULL,
  city VARCHAR(100) NOT NULL,
  cnpj VARCHAR(14) UNIQUE,
  user_id UUID NOT NULL REFERENCES custom_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## ⚙️ Funcionalidades

### 🔍 Consulta de Clientes
- **Localização**: `/clients`
- **Busca por**: código, nome, cidade, CNPJ
- **Paginação**: 50 itens por página
- **Filtros**: automáticos por usuário

### 📥 Importação em Massa
- **Localização**: `/products/import` (aba "Clientes")
- **Formatos**: CSV, TXT
- **Separadores**: `;` (recomendado) ou `,`
- **Seleção de usuário**: obrigatória para vincular clientes
- **Validações**: duplicatas, CNPJ, campos obrigatórios

## 📤 Importação em Massa

### Formato do Arquivo
```
Código;Nome do Cliente;Cidade;CNPJ
001;CLIENTE EXEMPLO LTDA;SAO PAULO;12345678000195
002;EMPRESA TESTE SA;RIO DE JANEIRO;98765432000142
003;COMERCIO ABC;BELO HORIZONTE;11122233000166
```

### Validações Aplicadas
- ✅ **Código**: obrigatório, máximo 20 caracteres, único
- ✅ **Nome**: obrigatório, máximo 255 caracteres
- ✅ **Cidade**: obrigatória, máximo 100 caracteres
- ✅ **CNPJ**: opcional, 14 dígitos, único, não repetitivo
- ✅ **Usuário**: obrigatório para vinculação

### Processo de Importação
1. **Upload** do arquivo CSV/TXT
2. **Seleção** do usuário responsável
3. **Preview** dos dados (10 primeiras linhas)
4. **Validação** completa dos dados
5. **Processamento** em lotes de 1000 registros
6. **Relatório** de sucesso/erros

### Tratamento de Erros
- Duplicatas no arquivo
- Duplicatas no banco de dados
- Campos obrigatórios vazios
- CNPJ inválido
- Limites de caracteres excedidos

## 🛠️ API Endpoints

### POST `/api/clients/import`
Importa clientes em massa

**Request Body:**
```json
{
  "clients": [
    {
      "code": "001",
      "client": "CLIENTE EXEMPLO LTDA",
      "city": "SAO PAULO", 
      "cnpj": "12345678000195",
      "user_id": "uuid-do-usuario"
    }
  ]
}
```

**Response (Modo Padrão):**
```json
{
  "success": true,
  "count": 150,
  "message": "150 clientes importados com sucesso",
  "totalProcessed": 152,
  "errors": []
}
```

**Request Body (UPSERT):**
```json
{
  "clients": [
    {
      "code": "001",
      "client": "CLIENTE EXEMPLO LTDA",
      "city": "SAO PAULO", 
      "cnpj": "12345678000195",
      "user_id": "uuid-do-usuario"
    }
  ],
  "allowUpdates": true
}
```

**Response (Modo UPSERT):**
```json
{
  "success": true,
  "count": 147,
  "message": "45 inseridos, 102 atualizados",
  "totalProcessed": 150,
  "errors": ["Linha 3: CNPJ já existe"],
  "inserted": 45,
  "updated": 102,
  "unchanged": 3,
  "updateDetails": [
    {
      "code": "001",
      "changes": ["nome: \"EMPRESA ABC\" → \"EMPRESA ABC LTDA\""]
    }
  ]
}
```

## 📂 Estrutura de Arquivos

### Componentes Principais
```
📁 presentation/components/clients/
├── ClientsTable.tsx          # Tabela de exibição
├── ClientSearchForm.tsx      # Formulário de busca
└── ClientCard.tsx           # Card individual (mobile)

📁 src/modules/clients/presentation/components/
└── ClientCSVImport.tsx      # Componente de importação

📁 src/modules/clients/application/use-cases/
├── get-all-clients.use-case.ts
├── search-clients.use-case.ts
└── import-clients.use-case.ts

📁 src/modules/clients/infrastructure/repositories/
└── supabase-client.repository.ts

📁 presentation/hooks/
├── useClients.ts            # Hook para listagem
└── useClientSearch.ts       # Hook para busca
```

### Páginas
```
📁 app/(dashboard)/
├── clients/page.tsx         # Página de consulta
└── products/import/page.tsx # Página de importação (aba clientes)
```

## 🚀 Como Usar

### Para Usuários Finais

#### Consultar Clientes
1. Acesse **Clientes** no menu principal
2. Digite termo de busca (código, nome, cidade ou CNPJ)
3. Visualize resultados paginados
4. Use filtros para refinar a busca

#### Importar Clientes (Admin)
1. Acesse **Importar Dados** no menu
2. Clique na aba **Clientes**
3. Selecione o **usuário responsável**
4. Faça upload do arquivo CSV/TXT
5. Visualize o **preview** dos dados
6. Clique em **Importar Clientes**
7. Aguarde o processamento e veja o relatório

### Para Desenvolvedores

#### Usar Repository
```typescript
import { SupabaseClientRepository } from "@/src/modules/clients/infrastructure/repositories/supabase-client.repository"

const clientRepository = new SupabaseClientRepository()

// Buscar todos os clientes (com paginação)
const clients = await clientRepository.findAll({ page: 1, limit: 50 })

// Buscar por código
const client = await clientRepository.findByCode("001")

// Buscar por termo
const results = await clientRepository.search("EXEMPLO", 1, 50)
```

#### Usar Hooks
```typescript
import { useClients } from "@/presentation/hooks/useClients"
import { useClientSearch } from "@/presentation/hooks/useClientSearch"

// Hook para listagem
const { data: clients, isLoading } = useClients({ page: 1 })

// Hook para busca
const { data: searchResults } = useClientSearch({
  query: "EXEMPLO",
  page: 1,
  pageSize: 50,
  enabled: true
})
```

## 🔒 Segurança e Permissões

### Controle de Acesso
- **Consulta**: Todos os usuários autenticados
- **Importação**: Apenas administradores
- **Dados**: Isolamento por usuário (exceto admins)

### Validações de Segurança
- Autenticação obrigatória
- Filtros automáticos por usuário
- Validação de entrada em todas as operações
- Sanitização de dados CNPJ

## 📊 Performance

### Otimizações Implementadas
- **Paginação**: Máximo 50 itens por página
- **Cache**: React Query com 5 minutos de cache
- **Batch Processing**: Importação em lotes de 1000
- **Índices**: Code, CNPJ, user_id indexados
- **Lazy Loading**: Componentes carregados sob demanda

## 🐛 Troubleshooting

### Problemas Comuns

**Erro de RLS:**
- ✅ Solucionado: RLS desabilitado, filtros no código

**Importação lenta:**
- Usar arquivo com separador `;`
- Reduzir tamanho do lote se necessário

**CNPJ inválido:**
- Verificar se tem exatamente 14 dígitos
- Remover caracteres especiais

**Usuário não encontrado:**
- Verificar se usuário está ativo
- Confirmar permissões de administrador

## 📝 Changelog

### v2.0.0 - 28/07/2025 - 🔄 MODO UPSERT
**🎉 FUNCIONALIDADE PRINCIPAL:**
- ✅ **Modo UPSERT**: Sistema de importação com inserção + atualização
- ✅ **API aprimorada**: Parâmetro `allowUpdates` no endpoint
- ✅ **Repository otimizado**: Método `findByCodes()` para busca em massa
- ✅ **Entidade inteligente**: Métodos `hasChanges()` e `getChangedFields()`
- ✅ **Use Case avançado**: Lógica completa de upsert com comparação
- ✅ **Interface melhorada**: Checkbox e relatório detalhado de mudanças
- ✅ **Performance**: Busca otimizada e validação condicional

**🏗️ ARQUITETURA:**
- Domain: Métodos de comparação na ClientEntity
- Application: ImportClientsUseCase com lógica de upsert
- Infrastructure: Busca em lote no SupabaseClientRepository  
- Presentation: Interface com controle de modo e relatório expandido

### v1.0.0 - 13/06/2025 - Implementação Inicial
- ✅ Módulo completo de clientes
- ✅ Clean Architecture
- ✅ Relacionamento usuário-cliente
- ✅ Importação em massa (apenas inserção)
- ✅ Interface responsiva
- ✅ Validações completas
- ✅ Documentação completa

---

**Data de criação**: 13/06/2025  
**Última atualização**: 28/07/2025  
**Versão**: 2.0.0 - MODO UPSERT