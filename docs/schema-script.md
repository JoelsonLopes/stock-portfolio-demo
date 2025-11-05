# Schema Script - Setup Completo do Banco de Dados

> **Data de atualização:** 2025-01-06  
> **Status:** Testado e funcionando ✅  
> **Ordem de execução:** Execute os scripts na ordem apresentada

---

## 📋 **Visão Geral**

Este documento contém todos os scripts SQL necessários para configurar o banco de dados do Stock-SP no Supabase. Os scripts devem ser executados **na ordem apresentada** para garantir o funcionamento completo do sistema.

## ⚠️ **IMPORTANTE**

- Execute os scripts **um por vez** no SQL Editor do Supabase
- Aguarde cada script terminar antes de executar o próximo
- Todos os scripts foram testados e estão funcionando corretamente

---

## 🗄️ **SCRIPT 1: Criação das Tabelas Base**

```sql
-- =====================================================
-- SCRIPT 1: CRIAÇÃO DAS TABELAS BASE
-- Descrição: Cria as tabelas principais do sistema
-- =====================================================

-- Tabela: equivalences
CREATE TABLE public.equivalences (
  id bigserial not null,
  product_code character varying(255) not null,
  equivalent_code character varying(255) not null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint equivalences_pkey primary key (id)
) TABLESPACE pg_default;

-- Índices básicos para equivalences
CREATE INDEX IF NOT EXISTS idx_equivalences_product_code ON public.equivalences USING btree (product_code) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_equivalences_equivalent_code ON public.equivalences USING btree (equivalent_code) TABLESPACE pg_default;
CREATE UNIQUE INDEX IF NOT EXISTS idx_equivalences_unique ON public.equivalences USING btree (product_code, equivalent_code) TABLESPACE pg_default;

-- Tabela: products
CREATE TABLE public.products (
  id bigserial not null,
  product character varying(255) not null,
  stock integer null default 0,
  price numeric(10, 2) null default 0.00,
  application text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint products_pkey primary key (id)
) TABLESPACE pg_default;

-- Índices básicos para products
CREATE INDEX IF NOT EXISTS idx_products_product ON public.products USING btree (product) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_products_stock ON public.products USING btree (stock) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_products_price ON public.products USING btree (price) TABLESPACE pg_default;

-- Tabela: custom_users
CREATE TABLE public.custom_users (
  id uuid not null default extensions.uuid_generate_v4(),
  name character varying(255) not null,
  password character varying(255) not null,
  active boolean not null default true,
  is_admin boolean not null default false,
  created_at timestamp with time zone not null default CURRENT_TIMESTAMP,
  updated_at timestamp with time zone null default CURRENT_TIMESTAMP,
  must_change_password boolean null default true,
  password_changed_at timestamp with time zone null,
  last_login timestamp with time zone null,
  constraint custom_users_pkey primary key (id),
  constraint custom_users_name_key unique (name)
) TABLESPACE pg_default;

-- Índices básicos para custom_users
CREATE INDEX IF NOT EXISTS idx_custom_users_name ON public.custom_users USING btree (name) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_custom_users_active ON public.custom_users USING btree (active) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_custom_users_is_admin ON public.custom_users USING btree (is_admin) TABLESPACE pg_default;
```

---

## ⚡ **SCRIPT 2: Índices de Performance**

```sql
-- =====================================================
-- SCRIPT 2: ÍNDICES DE PERFORMANCE
-- Descrição: Adiciona índices otimizados para consultas
-- =====================================================

-- Ativar extensão pg_trgm para busca por similaridade
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Índices otimizados para products
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_product_gin 
ON public.products USING gin (product gin_trgm_ops) TABLESPACE pg_default;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_id_product 
ON public.products USING btree (id, product) TABLESPACE pg_default;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_price_product 
ON public.products USING btree (price, product) TABLESPACE pg_default;

-- Índices otimizados para equivalences
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_equivalences_codes_composite 
ON public.equivalences USING btree (product_code, equivalent_code) 
INCLUDE (id, created_at) TABLESPACE pg_default;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_equivalences_sorted 
ON public.equivalences USING btree (product_code, equivalent_code, id) TABLESPACE pg_default;
```

---

## 🔐 **SCRIPT 3: Setup de Hash de Senhas**

```sql
-- =====================================================
-- SCRIPT 3: SETUP DE HASH DE SENHAS
-- Descrição: Configura criptografia automática de senhas
-- =====================================================

-- Habilita a extensão pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Função para gerar hash de senha
CREATE OR REPLACE FUNCTION hash_password(password text)
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN crypt(password, gen_salt('bf', 8));
END;
$$;

-- Função para atualizar senha de um usuário
CREATE OR REPLACE FUNCTION update_user_password(
  p_user_id uuid,
  p_new_password text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE custom_users
  SET password = hash_password(p_new_password),
      updated_at = now()
  WHERE id = p_user_id;
END;
$$;

-- Trigger para automaticamente hashear senhas novas
CREATE OR REPLACE FUNCTION hash_password_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Só hasheia se a senha foi alterada
  IF TG_OP = 'INSERT' OR new.password != old.password THEN
    new.password = hash_password(new.password);
  END IF;
  RETURN new;
END;
$$;

-- Aplica o trigger na tabela
DROP TRIGGER IF EXISTS hash_password_trigger ON custom_users;
CREATE TRIGGER hash_password_trigger
  BEFORE INSERT OR UPDATE ON custom_users
  FOR EACH ROW
  EXECUTE FUNCTION hash_password_trigger();
```

---

## 🛡️ **SCRIPT 4: Row Level Security (RLS)**

```sql
-- =====================================================
-- SCRIPT 4: ROW LEVEL SECURITY
-- Descrição: Configura políticas de segurança
-- =====================================================

-- Habilita RLS para as tabelas
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE equivalences ENABLE ROW LEVEL SECURITY;

-- Função para definir usuário na sessão (OBRIGATÓRIA)
CREATE OR REPLACE FUNCTION set_request_user(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM set_config('request.user.id', user_id::text, true);
END;
$$;

-- Função auxiliar para verificar se o usuário está autenticado
CREATE OR REPLACE FUNCTION is_authenticated()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (current_setting('request.user.id', true))::uuid IS NOT NULL;
END;
$$;

-- Políticas para tabela products
CREATE POLICY "Usuários autenticados podem ver todos os produtos"
  ON products
  FOR SELECT
  TO authenticated
  USING (is_authenticated());

CREATE POLICY "Usuários autenticados podem inserir produtos"
  ON products
  FOR INSERT
  TO authenticated
  WITH CHECK (is_authenticated());

CREATE POLICY "Usuários autenticados podem atualizar produtos"
  ON products
  FOR UPDATE
  TO authenticated
  USING (is_authenticated())
  WITH CHECK (is_authenticated());

CREATE POLICY "Usuários autenticados podem deletar produtos"
  ON products
  FOR DELETE
  TO authenticated
  USING (is_authenticated());

-- Políticas para tabela equivalences
CREATE POLICY "Usuários autenticados podem ver todas as equivalências"
  ON equivalences
  FOR SELECT
  TO authenticated
  USING (is_authenticated());

CREATE POLICY "Usuários autenticados podem inserir equivalências"
  ON equivalences
  FOR INSERT
  TO authenticated
  WITH CHECK (is_authenticated());

CREATE POLICY "Usuários autenticados podem atualizar equivalências"
  ON equivalences
  FOR UPDATE
  TO authenticated
  USING (is_authenticated())
  WITH CHECK (is_authenticated());

CREATE POLICY "Usuários autenticados podem deletar equivalências"
  ON equivalences
  FOR DELETE
  TO authenticated
  USING (is_authenticated());
```

---

## 🔑 **SCRIPT 5: Função de Autenticação**

```sql
-- =====================================================
-- SCRIPT 5: FUNÇÃO DE AUTENTICAÇÃO
-- Descrição: Cria função segura para login de usuários
-- =====================================================

-- Função para autenticar usuário de forma segura
CREATE OR REPLACE FUNCTION authenticate_user(
  p_name text,
  p_password text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user record;
  v_result json;
  v_hashed_attempt text;
BEGIN
  -- Log inicial
  RAISE NOTICE 'Tentativa de autenticação para usuário: %', p_name;
  
  -- Busca o usuário (removendo espaços em branco do nome)
  SELECT *
  INTO v_user
  FROM custom_users
  WHERE trim(name) = trim(p_name)
    AND active = true;
    
  IF v_user.id IS NULL THEN
    RAISE NOTICE 'Usuário não encontrado: %', p_name;
    RETURN json_build_object(
      'success', false,
      'message', 'Usuário não encontrado'
    );
  END IF;

  -- Tenta validar a senha
  IF v_user.password = crypt(p_password, v_user.password) THEN
    -- Define o usuário na sessão atual
    PERFORM set_request_user(v_user.id::uuid);
    
    RAISE NOTICE 'Autenticação bem-sucedida para usuário: %', p_name;
    
    -- Retorna os dados do usuário (INCLUINDO must_change_password)
    RETURN json_build_object(
      'success', true,
      'user', json_build_object(
        'id', v_user.id,
        'name', v_user.name,
        'active', v_user.active,
        'is_admin', v_user.is_admin,
        'must_change_password', v_user.must_change_password,
        'password_changed_at', v_user.password_changed_at,
        'created_at', v_user.created_at
      )
    );
  ELSE
    RAISE NOTICE 'Senha inválida para usuário: %', p_name;
    RETURN json_build_object(
      'success', false,
      'message', 'Senha inválida'
    );
  END IF;
END;
$$;
```

---

## 🔄 **SCRIPT 6: Função de Mudança de Senha**

```sql
-- =====================================================
-- SCRIPT 6: FUNÇÃO DE MUDANÇA DE SENHA
-- Descrição: Permite alteração segura de senhas
-- =====================================================

-- Função corrigida para mudança de senha (evita double hash)
CREATE OR REPLACE FUNCTION change_user_password(
  p_user_id uuid,
  p_current_password text,
  p_new_password text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user record;
  v_current_hashed text;
BEGIN
  -- Busca o usuário
  SELECT * INTO v_user
  FROM custom_users
  WHERE id = p_user_id;

  -- Verifica se o usuário existe
  IF v_user.id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Usuário não encontrado'
    );
  END IF;

  -- Verifica se a senha atual está correta
  IF v_user.password != crypt(p_current_password, v_user.password) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Senha atual incorreta'
    );
  END IF;

  -- Validação de tamanho mínimo (6 caracteres)
  IF length(p_new_password) < 6 THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Nova senha deve ter pelo menos 6 caracteres'
    );
  END IF;

  -- Validação contra senha padrão
  IF p_new_password = '1234' THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Nova senha não pode ser igual à senha padrão'
    );
  END IF;

  -- Validação se é diferente da atual
  IF p_current_password = p_new_password THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Nova senha deve ser diferente da senha atual'
    );
  END IF;

  -- Atualiza a senha (deixa o trigger hashear automaticamente)
  UPDATE custom_users
  SET 
    password = p_new_password,  -- SEM HASH! O trigger faz isso
    must_change_password = false,
    password_changed_at = now(),
    updated_at = now()
  WHERE id = p_user_id;

  RETURN json_build_object(
    'success', true,
    'message', 'Senha alterada com sucesso'
  );
END;
$$;
```

---

## 👤 **SCRIPT 7: Criação do Usuário Inicial**

```sql
-- =====================================================
-- SCRIPT 7: USUÁRIO INICIAL
-- Descrição: Cria usuário admin padrão para testes
-- =====================================================

-- Cria usuário inicial (senha será hasheada automaticamente pelo trigger)
INSERT INTO custom_users (name, password, active, is_admin, must_change_password)
VALUES ('Joelson', '1234', true, true, true)
ON CONFLICT (name) DO NOTHING;

-- Verificar se o usuário foi criado corretamente
SELECT id, name, active, is_admin, must_change_password, created_at 
FROM custom_users 
WHERE name = 'Joelson';
```

## 🔄 **SCRIPT 8: Reset da Tabela Products**

```sql
-- =====================================================
-- SCRIPT 8: RESET TABELA PRODUCTS E EUIVALENCES
-- Descrição: Limpa todos os dados e reseta ID para 1
-- =====================================================

-- Limpa todos os dados da tabela
DELETE FROM products;
DELETE FROM equivalences


-- Reseta a sequência do ID para começar do 1
ALTER SEQUENCE products_id_seq RESTART WITH 1;
ALTER SEQUENCE equivalences_id_seq RESTART WITH 1;

-- Verificar se a tabela foi limpa e a sequência resetada
SELECT 
    (SELECT COUNT(*) FROM products) as total_registros,
    (SELECT last_value FROM products_id_seq) as proximo_id;

-- Opcional: Verificar se não há registros restantes
SELECT 'Tabela limpa com sucesso!' as status 
WHERE (SELECT COUNT(*) FROM products) = 0;
```

---



## ✅ **Verificação Final**

Execute para verificar se tudo está funcionando:

```sql
-- Verificar tabelas criadas
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('custom_users', 'products', 'equivalences');

-- Verificar índices criados
SELECT schemaname, tablename, indexname 
FROM pg_indexes 
WHERE tablename IN ('products', 'equivalences', 'custom_users') 
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- Verificar funções criadas
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('authenticate_user', 'change_user_password', 'set_request_user', 'hash_password');

-- Testar autenticação
SELECT authenticate_user('Joelson', '1234');
```

---



## 📝 **Notas Importantes**

### **Correções Aplicadas:**
- ✅ **Função `set_request_user`** adicionada (era missing)
- ✅ **Campo `must_change_password`** incluído no retorno de `authenticate_user`
- ✅ **Double hash** corrigido na função `change_user_password`

### **Fluxo de Teste:**
1. Login com usuário **Joelson** / senha **1234**
2. Sistema redireciona para mudança de senha
3. Troca senha (mínimo 6 caracteres, diferente de "1234")
4. Logout e login com nova senha
5. ✅ Acesso liberado ao sistema

### **Ordem de Execução:**
1. Script 1 → Tabelas base
2. Script 2 → Índices de performance  
3. Script 3 → Hash de senhas
4. Script 4 → Row Level Security
5. Script 5 → Função de autenticação
6. Script 6 → Função de mudança de senha
7. Script 7 → Usuário inicial
8. Script 8 → Reset tabela products (opcional - para limpar dados)

**Status:** ✅ **Testado e funcionando perfeitamente**