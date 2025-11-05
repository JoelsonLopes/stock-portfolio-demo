# Schema Script Clients - Setup da Tabela de Clientes

> **Data de criação:** 2025-01-13  
> **Status:** Pronto para execução ⚠️  
> **Baseado em:** docs/schema-script.md (padrão products)
> **Ordem de execução:** Execute os scripts na ordem apresentada

---

## 📋 **Visão Geral**

Este documento contém todos os scripts SQL necessários para configurar a tabela `clients` no Supabase, seguindo **exatamente o mesmo padrão** da tabela `products` já existente e funcionando.

## ⚠️ **IMPORTANTE**

- Execute os scripts **um por vez** no SQL Editor do Supabase
- Aguarde cada script terminar antes de executar o próximo
- Scripts baseados na estrutura testada e funcionando da tabela products

---

## 🗄️ **SCRIPT 1: Criação da Tabela Clients**

```sql
-- =====================================================
-- SCRIPT 1: CRIAÇÃO DA TABELA CLIENTS
-- Descrição: Cria a tabela de clientes seguindo padrão products
-- =====================================================

-- Tabela: clients
CREATE TABLE public.clients (
  id bigserial not null,
  code character varying(255) not null,
  client character varying(255) not null,
  city character varying(255) null,
  cnpj character varying(18) null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint clients_pkey primary key (id)
) TABLESPACE pg_default;

-- Índices básicos para clients (seguindo padrão products)
CREATE INDEX IF NOT EXISTS idx_clients_code ON public.clients USING btree (code) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_clients_client ON public.clients USING btree (client) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_clients_city ON public.clients USING btree (city) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_clients_cnpj ON public.clients USING btree (cnpj) TABLESPACE pg_default;

-- Índice único para garantir que não haja códigos duplicados
CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_code_unique ON public.clients USING btree (code) TABLESPACE pg_default;
```

---

## ⚡ **SCRIPT 2: Índices de Performance para Clients**

```sql
-- =====================================================
-- SCRIPT 2: ÍNDICES DE PERFORMANCE PARA CLIENTS
-- Descrição: Adiciona índices otimizados para consultas (padrão products)
-- =====================================================

-- Índices otimizados para clients (seguindo padrão products)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_client_gin 
ON public.clients USING gin (client gin_trgm_ops) TABLESPACE pg_default;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_code_gin 
ON public.clients USING gin (code gin_trgm_ops) TABLESPACE pg_default;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_city_gin 
ON public.clients USING gin (city gin_trgm_ops) TABLESPACE pg_default;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_id_client 
ON public.clients USING btree (id, client) TABLESPACE pg_default;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_code_client 
ON public.clients USING btree (code, client) TABLESPACE pg_default;

-- Índice composto para otimizar buscas combinadas
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_composite 
ON public.clients USING btree (client, code, city) 
INCLUDE (id, cnpj, created_at) TABLESPACE pg_default;
```

---

## 🔐 **SCRIPT 3: Row Level Security para Clients**

```sql
-- =====================================================
-- SCRIPT 3: ROW LEVEL SECURITY PARA CLIENTS
-- Descrição: Configura políticas de segurança (seguindo padrão products)
-- =====================================================

-- Habilitar RLS na tabela clients
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Políticas para tabela clients (corrigidas)
CREATE POLICY "Usuários autenticados podem ver todos os clientes"
  ON clients
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuários autenticados podem inserir clientes"
  ON clients
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem atualizar clientes"
  ON clients
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem deletar clientes"
  ON clients
  FOR DELETE
  TO authenticated
  USING (true);

---

## 🎲 **SCRIPT 4: Dados de Teste (Opcional)**

```sql
-- =====================================================
-- SCRIPT 4: DADOS DE TESTE PARA CLIENTS
-- Descrição: Insere alguns clientes de exemplo para teste
-- =====================================================

-- Insere clientes de exemplo (opcional para testes)
INSERT INTO public.clients (code, client, city, cnpj) VALUES
('318', 'ACESSORIOS FLORESTA LTDA', 'PORTO ALEGRE', '87.127.486/0001-01'),
('443', 'TURBO MOTOCICLETAS E SERVICOS LTDA', 'PORTO ALEGRE', '87.278.115/0001-20'),
('754', 'TONIOLO BUSNELLO S.A', 'PORTO ALEGRE', '89.723.977/0001-40'),
('767', 'AUTO VIACAO PRESIDENTE VARGAS LTDA', 'PORTO ALEGRE', '92.807.312/0001-20'),
('781', 'CONSTRUTORA PELOTENSE LTDA', 'PORTO ALEGRE', '92.190.503/0001-95'),
('807', 'EXPRESSO FREDERES S/A', 'PORTO ALEGRE', '92.745.991/0001-50'),
('811', 'EXPRESSO REICHELT LTDA', 'PORTO ALEGRE', '92.703.198/0001-98'),
('831', 'NAVEGACAO GUARITA LTDA', 'PORTO ALEGRE', '92.786.680/0001-39')
ON CONFLICT (code) DO NOTHING;
```

---

## ✅ **Verificação Final**

Execute para verificar se tudo está funcionando:

```sql
-- Verificar se a tabela foi criada
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'clients';

-- Verificar índices criados
SELECT schemaname, tablename, indexname 
FROM pg_indexes 
WHERE tablename = 'clients' 
AND indexname LIKE 'idx_%'
ORDER BY indexname;

-- Verificar dados inseridos (se executou o script 4)
SELECT count(*) as total_clients FROM public.clients;

-- Verificar estrutura da tabela
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'clients' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Testar busca por similaridade (se tem dados)
SELECT client, code, city, cnpj 
FROM public.clients 
WHERE client ILIKE '%SANTOS%' 
ORDER BY client;
```

---

## 📝 **Notas Importantes**

### **Estrutura da Tabela Clients:**
- ✅ **code** - Código único do cliente (obrigatório)
- ✅ **client** - Nome do cliente (obrigatório, campo principal para busca)
- ✅ **city** - Cidade do cliente (opcional)
- ✅ **cnpj** - CNPJ do cliente (opcional, formato: XX.XXX.XXX/XXXX-XX)
- ✅ **timestamps** - created_at e updated_at automáticos

### **Recursos Implementados:**
- ✅ **Busca por similaridade** com pg_trgm (igual products)
- ✅ **Índices otimizados** para performance
- ✅ **Row Level Security** com as mesmas políticas
- ✅ **Validação de unicidade** no código do cliente
- ✅ **Timestamps automáticos** para auditoria

### **Próximos Passos:**
1. Executar scripts no Supabase
2. Criar entidades no código TypeScript
3. Implementar repositórios e use cases
4. Criar componentes de interface
5. Implementar tela de clientes

**Status:** ✅ **Pronto para implementação no Supabase**