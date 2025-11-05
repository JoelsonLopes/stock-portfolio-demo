# Relacionamento Usuários ↔ Clientes - Scripts de Migração

> **Data de criação:** 2025-01-13  
> **Status:** Pronto para execução ⚠️  
> **Objetivo:** Implementar controle de acesso por usuário
> **Ordem de execução:** Execute os scripts na ordem apresentada

---

## 📋 **Visão Geral**

Este documento contém todos os scripts SQL necessários para implementar o relacionamento entre `custom_users` e `clients`, garantindo que cada usuário veja apenas seus próprios clientes.

## ⚠️ **IMPORTANTE - BACKUP OBRIGATÓRIO**

- ⚠️ **FAÇA BACKUP** da tabela clients antes de executar
- Execute os scripts **um por vez** no SQL Editor do Supabase
- **TESTE** em ambiente de desenvolvimento primeiro
- Verifique se não há consultas ativas durante a execução

---

## 🗄️ **SCRIPT 1: Adicionar Relacionamento user_id**

```sql
-- =====================================================
-- SCRIPT 1: ADICIONAR RELACIONAMENTO USER_ID
-- Descrição: Adiciona coluna user_id e foreign key constraint
-- =====================================================

-- 1. Adicionar coluna user_id na tabela clients
ALTER TABLE public.clients 
ADD COLUMN user_id uuid REFERENCES public.custom_users(id) ON DELETE CASCADE;

-- 2. Comentário para documentação
COMMENT ON COLUMN public.clients.user_id IS 'FK para custom_users - define qual usuário possui este cliente';

-- 3. Criar índice para otimizar consultas por usuário
CREATE INDEX IF NOT EXISTS idx_clients_user_id 
ON public.clients USING btree (user_id) TABLESPACE pg_default;

-- 4. Criar índice composto para otimizar consultas filtradas
CREATE INDEX IF NOT EXISTS idx_clients_user_client 
ON public.clients USING btree (user_id, client) TABLESPACE pg_default;

-- 5. Verificar a estrutura atualizada
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'clients' 
AND table_schema = 'public'
ORDER BY ordinal_position;
```

---

## 👤 **SCRIPT 2: Migração de Dados Existentes**

```sql
-- =====================================================
-- SCRIPT 2: MIGRAÇÃO DE DADOS EXISTENTES
-- Descrição: Atribui clientes existentes aos usuários
-- =====================================================

-- Estratégia: Atribuir todos os clientes existentes ao primeiro usuário admin
-- (Você pode modificar esta lógica conforme sua necessidade)

-- 1. Verificar usuários disponíveis
SELECT id, name, is_admin, active 
FROM public.custom_users 
WHERE active = true 
ORDER BY created_at;

-- 2. Atribuir clientes ao primeiro usuário admin
UPDATE public.clients 
SET user_id = (
    SELECT id 
    FROM public.custom_users 
    WHERE active = true AND is_admin = true 
    ORDER BY created_at 
    LIMIT 1
)
WHERE user_id IS NULL;

-- 3. Verificar resultado da migração
SELECT 
    u.name as usuario,
    COUNT(c.id) as total_clientes
FROM public.custom_users u
LEFT JOIN public.clients c ON u.id = c.user_id
WHERE u.active = true
GROUP BY u.id, u.name
ORDER BY u.name;

-- 4. Verificar se há clientes sem usuário (deve ser 0)
SELECT COUNT(*) as clientes_sem_usuario 
FROM public.clients 
WHERE user_id IS NULL;
```

---

## 🛡️ **SCRIPT 3: Atualizar Row Level Security (RLS)**

```sql
-- =====================================================
-- SCRIPT 3: ATUALIZAR ROW LEVEL SECURITY
-- Descrição: Modifica políticas para filtrar por usuário
-- =====================================================

-- 1. Remover políticas antigas
DROP POLICY IF EXISTS "Usuários autenticados podem ver todos os clientes" ON public.clients;
DROP POLICY IF EXISTS "Usuários autenticados podem inserir clientes" ON public.clients;
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar clientes" ON public.clients;
DROP POLICY IF EXISTS "Usuários autenticados podem deletar clientes" ON public.clients;

-- 2. Criar função para obter o user_id atual da sessão
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (current_setting('request.user.id', true))::uuid;
END;
$$;

-- 3. Criar função para verificar se é admin
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_is_admin boolean;
BEGIN
  SELECT is_admin INTO user_is_admin
  FROM public.custom_users 
  WHERE id = get_current_user_id();
  
  RETURN COALESCE(user_is_admin, false);
END;
$$;

-- 4. NOVA POLÍTICA - SELECT: Usuário vê apenas seus clientes (Admin vê todos)
CREATE POLICY "Usuários veem apenas seus próprios clientes"
  ON public.clients
  FOR SELECT
  TO authenticated
  USING (
    user_id = get_current_user_id() 
    OR is_admin_user()
  );

-- 5. NOVA POLÍTICA - INSERT: Usuário só pode inserir clientes para si mesmo
CREATE POLICY "Usuários inserem clientes apenas para si"
  ON public.clients
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = get_current_user_id()
  );

-- 6. NOVA POLÍTICA - UPDATE: Usuário só pode atualizar seus clientes
CREATE POLICY "Usuários atualizam apenas seus próprios clientes"
  ON public.clients
  FOR UPDATE
  TO authenticated
  USING (
    user_id = get_current_user_id() 
    OR is_admin_user()
  )
  WITH CHECK (
    user_id = get_current_user_id()
  );

-- 7. NOVA POLÍTICA - DELETE: Usuário só pode deletar seus clientes
CREATE POLICY "Usuários deletam apenas seus próprios clientes"
  ON public.clients
  FOR DELETE
  TO authenticated
  USING (
    user_id = get_current_user_id() 
    OR is_admin_user()
  );
```

---

## 🧪 **SCRIPT 4: Testes de Validação**

```sql
-- =====================================================
-- SCRIPT 4: TESTES DE VALIDAÇÃO
-- Descrição: Valida se o relacionamento está funcionando
-- =====================================================

-- 1. Verificar estrutura da tabela
\d public.clients;

-- 2. Verificar políticas RLS ativas
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies 
WHERE tablename = 'clients';

-- 3. Verificar distribuição de clientes por usuário
SELECT 
    u.name as usuario,
    u.is_admin,
    COUNT(c.id) as total_clientes,
    STRING_AGG(c.client, ', ' ORDER BY c.client LIMIT 3) as exemplos_clientes
FROM public.custom_users u
LEFT JOIN public.clients c ON u.id = c.user_id
WHERE u.active = true
GROUP BY u.id, u.name, u.is_admin
ORDER BY u.name;

-- 4. Verificar índices criados
SELECT 
    indexname, 
    indexdef
FROM pg_indexes 
WHERE tablename = 'clients' 
AND indexname LIKE '%user%';

-- 5. Teste de performance - busca por usuário
EXPLAIN ANALYZE 
SELECT * FROM public.clients 
WHERE user_id = (SELECT id FROM public.custom_users LIMIT 1);
```

---

## 🔧 **SCRIPT 5: Dados de Teste (Opcional)**

```sql
-- =====================================================
-- SCRIPT 5: CRIAR USUÁRIOS E CLIENTES DE TESTE
-- Descrição: Dados para testar o relacionamento
-- =====================================================

-- 1. Criar usuário de teste "Maria" (se não existir)
INSERT INTO public.custom_users (name, password, active, is_admin, must_change_password)
VALUES ('Maria', '1234', true, false, true)
ON CONFLICT (name) DO NOTHING;

-- 2. Obter IDs dos usuários para os testes
WITH user_ids AS (
  SELECT 
    id,
    name,
    ROW_NUMBER() OVER (ORDER BY name) as rn
  FROM public.custom_users 
  WHERE active = true
  ORDER BY name
)
SELECT id, name FROM user_ids;

-- 3. Criar clientes específicos para cada usuário
-- (Substitua os UUIDs pelos IDs reais dos seus usuários)

-- Clientes para Joelson (substitua pelo UUID real)
INSERT INTO public.clients (code, client, city, cnpj, user_id) VALUES
('J001', 'CLIENTE JOELSON 1', 'SANTOS', '11.111.111/0001-01', 
  (SELECT id FROM public.custom_users WHERE name = 'Joelson' LIMIT 1)),
('J002', 'CLIENTE JOELSON 2', 'SAO PAULO', '11.111.111/0001-02', 
  (SELECT id FROM public.custom_users WHERE name = 'Joelson' LIMIT 1))
ON CONFLICT (code) DO NOTHING;

-- Clientes para Maria (substitua pelo UUID real)
INSERT INTO public.clients (code, client, city, cnpj, user_id) VALUES
('M001', 'CLIENTE MARIA 1', 'RIO DE JANEIRO', '22.222.222/0001-01', 
  (SELECT id FROM public.custom_users WHERE name = 'Maria' LIMIT 1)),
('M002', 'CLIENTE MARIA 2', 'BELO HORIZONTE', '22.222.222/0001-02', 
  (SELECT id FROM public.custom_users WHERE name = 'Maria' LIMIT 1))
ON CONFLICT (code) DO NOTHING;
```

---

## ✅ **Verificação Final Completa**

Execute para verificar se tudo está funcionando:

```sql
-- 1. Verificar estrutura final
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'clients' 
AND column_name IN ('id', 'code', 'client', 'user_id')
ORDER BY ordinal_position;

-- 2. Verificar constraint de foreign key
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name = 'clients';

-- 3. Testar políticas RLS simulando usuário
-- (Execute isso como teste após configurar um usuário)
SELECT set_request_user((SELECT id FROM custom_users WHERE name = 'Joelson' LIMIT 1));
SELECT COUNT(*) as clientes_visiveis FROM public.clients;

-- 4. Resetar configuração de teste
SELECT set_config('request.user.id', '', false);
```

---

## 📝 **Notas Importantes**

### **Mudanças Implementadas:**
- ✅ **Foreign Key**: `clients.user_id` → `custom_users.id`
- ✅ **Índices otimizados** para consultas por usuário
- ✅ **RLS personalizado** - cada usuário vê apenas seus clientes
- ✅ **Privilégios admin** - administradores veem todos os clientes
- ✅ **Integridade referencial** com CASCADE DELETE

### **Comportamento do Sistema:**
- 👤 **Usuário normal**: Vê apenas clientes onde `user_id = seu_id`
- 👑 **Usuário admin**: Vê todos os clientes (bypass do filtro)
- 🔒 **Segurança**: Políticas RLS aplicadas no nível do banco
- ⚡ **Performance**: Índices otimizados para consultas filtradas

### **Próximos Passos:**
1. ✅ Executar scripts SQL no Supabase
2. ⏳ Atualizar código TypeScript (ClientEntity, Repository)
3. ⏳ Ajustar componentes React para usuário logado
4. ⏳ Testar com múltiplos usuários

**Status:** ✅ **Scripts SQL prontos para execução**