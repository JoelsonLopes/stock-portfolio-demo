# 🚀 Guia de Deploy - Stock Portfolio Demo

Este guia fornece instruções **completas e detalhadas** para fazer o deploy da aplicação em produção usando Vercel e Supabase.

## 📋 Pré-requisitos

Antes de iniciar o deploy, certifique-se de ter:

- [ ] Conta no [Vercel](https://vercel.com) (plano gratuito funciona)
- [ ] Conta no [Supabase](https://supabase.com) com projeto criado
- [ ] Repositório no GitHub com o código atualizado
- [ ] Node.js 18+ instalado localmente
- [ ] Git configurado com acesso ao GitHub
- [ ] Token do Supabase antigo revogado (se foi exposto)

---

## 🔒 Passo 1: SEGURANÇA - Revogar Token Exposto

⚠️ **CRÍTICO:** Se você clonou este repositório, um token do Supabase foi exposto em commits anteriores. Você **DEVE** revogá-lo antes de prosseguir:

### 1.1 Acessar Painel do Supabase

1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **Settings** → **API**

### 1.2 Revogar e Regenerar Tokens

No painel de API, você verá duas chaves:

**A) anon (public) key:**
- Usada no frontend (pode ser exposta)
- Se quiser regenerar: clique em **Reset** ao lado da chave

**B) service_role (secret) key:**
- ⚠️ **NUNCA** deve ser exposta
- **DEVE** ser regenerada se foi commitada
- Clique em **Reset** e confirme
- **Copie a nova chave** (não aparecerá novamente)

### 1.3 Anotar Novas Credenciais

Anote as seguintes informações (você vai precisar no Passo 4):

```
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...sua-chave-anon-aqui
SUPABASE_SERVICE_ROLE_KEY=eyJ...sua-chave-service-role-aqui
```

---

## 🗄️ Passo 2: Verificar e Preparar Banco de Dados

### 2.1 Confirmar Migrações Aplicadas

Todas as migrações devem estar aplicadas. Verifique no Supabase:

1. Vá em **Database** → **Migrations**
2. Confira se estas migrações estão aplicadas (em ordem):

```
✓ 20250103000001_create_initial_tables.sql
✓ 20250103000002_add_unique_index_products_product_v2.sql
✓ 20250103000003_make_products_code_nullable_v2.sql
✓ 20250103000004_make_products_description_nullable.sql
✓ 20250103000005_make_products_group_id_nullable_optional.sql
✓ 20250103000006_recreate_products_table_production_schema.sql
✓ 20250103000007_align_product_groups_with_production.sql
✓ 20250103000008_recreate_products_group_id_fkey.sql
✓ 20250103000009_fix_order_items_product_id_type.sql
```

**Se alguma migração estiver faltando:**
- Vá em **SQL Editor**
- Execute o arquivo SQL correspondente de `/supabase/migrations/`

### 2.2 Verificar Estrutura das Tabelas Principais

Execute no **SQL Editor** do Supabase:

```sql
-- Verificar se products.id é BIGINT
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'products' AND column_name = 'id';
-- Resultado esperado: bigint

-- Verificar se order_items.product_id é BIGINT
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'order_items' AND column_name = 'product_id';
-- Resultado esperado: bigint

-- Verificar FKs importantes
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table,
  ccu.column_name AS foreign_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('order_items', 'orders', 'products')
ORDER BY tc.table_name;
```

### 2.3 Inserir Dados Essenciais

#### A) Verificar Product Groups

```sql
-- Verificar se há 38 grupos de produtos
SELECT COUNT(*) FROM product_groups;
-- Resultado esperado: 38
```

Se não houver 38 grupos, execute a migração `align_product_groups_with_production`.

#### B) Verificar Discounts

```sql
-- Verificar se há descontos cadastrados
SELECT id, name, discount_percentage, active FROM discounts;
```

Se não houver descontos, insira alguns exemplos:

```sql
INSERT INTO discounts (name, discount_percentage, commission_percentage, group_id, description, active)
VALUES
  ('Desconto Padrão', 5.00, 2.50, NULL, 'Desconto padrão para todos os produtos', true),
  ('Desconto Atacado', 10.00, 3.00, NULL, 'Desconto para compras em grande quantidade', true),
  ('Desconto VIP', 15.00, 5.00, NULL, 'Desconto para clientes VIP', true)
ON CONFLICT DO NOTHING;
```

#### C) Verificar Payment Conditions

```sql
-- Verificar condições de pagamento
SELECT * FROM payment_conditions;
```

Se vazio, insira as condições básicas:

```sql
INSERT INTO payment_conditions (name, days, installments, description, active)
VALUES
  ('À Vista', 0, 1, 'Pagamento à vista', true),
  ('30 dias', 30, 1, 'Pagamento em 30 dias', true),
  ('60 dias', 60, 1, 'Pagamento em 60 dias', true),
  ('90 dias', 90, 1, 'Pagamento em 90 dias', true)
ON CONFLICT DO NOTHING;
```

### 2.4 Configurar Row Level Security (RLS)

Execute para verificar e habilitar RLS:

```sql
-- Habilitar RLS nas tabelas principais
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE equivalences ENABLE ROW LEVEL SECURITY;

-- Verificar se RLS está habilitado
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

**Políticas RLS já devem estar criadas nas migrações.** Se não estiverem, verifique os arquivos de migração.

---

## 📤 Passo 3: Preparar Repositório para Deploy

### 3.1 Verificar .gitignore

Certifique-se de que arquivos sensíveis não serão commitados:

```bash
cat .gitignore
```

Deve incluir:
```
# Environment variables
.env
.env.local
.env*.local

# Supabase local
.supabase/

# AI Tools (não devem subir)
.claude/
.cursor/
.taskmaster/
CLAUDE.md
.mcp.json

# Dependencies
node_modules/
```

### 3.2 Testar Build Localmente

**Antes de fazer deploy, teste o build local:**

```bash
# Instalar dependências
npm install

# Criar arquivo .env.local com credenciais de teste
cp .env.example .env.local

# Editar .env.local e adicionar suas credenciais
# NEXT_PUBLIC_SUPABASE_URL=...
# NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# Testar build
npm run build

# Se o build falhar, corrija os erros antes de prosseguir
```

### 3.3 Commit e Push

```bash
# Verificar status
git status

# Adicionar alterações
git add .

# Fazer commit
git commit -m "chore: preparar para deploy em produção"

# Push para o repositório
git push origin main
```

**Se o push falhar com erro de autenticação:**
```bash
# Configurar credenciais do GitHub
git config --global user.name "Seu Nome"
git config --global user.email "seu-email@exemplo.com"

# Usar token de acesso pessoal como senha
# Gere em: https://github.com/settings/tokens
```

---

## 🌐 Passo 4: Deploy na Vercel

### 4.1 Criar Conta e Conectar GitHub

1. Acesse [vercel.com/signup](https://vercel.com/signup)
2. Escolha **Continue with GitHub**
3. Autorize a Vercel a acessar seus repositórios

### 4.2 Importar Projeto

1. Acesse [vercel.com/new](https://vercel.com/new)
2. Clique em **Import Git Repository**
3. Localize o repositório `stock-portfolio-demo`
4. Clique em **Import**

### 4.3 Configurar Variáveis de Ambiente

⚠️ **PASSO CRÍTICO:** Configure TODAS as variáveis antes de fazer deploy.

Na tela de configuração, clique em **Environment Variables** e adicione:

| Nome da Variável | Valor | Ambiente |
|------------------|-------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://seu-projeto.supabase.co` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` (chave anon) | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` (chave service_role) | **⚠️ APENAS Production** |
| `NODE_ENV` | `production` | Production |

**Instruções detalhadas:**

1. **NEXT_PUBLIC_SUPABASE_URL:**
   - Cole a URL do seu projeto Supabase
   - Exemplo: `https://qxgzwaqjphujlkrcjgfq.supabase.co`
   - Marque: ☑️ Production ☑️ Preview ☑️ Development

2. **NEXT_PUBLIC_SUPABASE_ANON_KEY:**
   - Cole a chave **anon public** do Supabase
   - Começa com `eyJ...`
   - Marque: ☑️ Production ☑️ Preview ☑️ Development

3. **SUPABASE_SERVICE_ROLE_KEY:**
   - ⚠️ **Chave SECRETA** - Cole a chave **service_role**
   - Começa com `eyJ...`
   - Marque: ☑️ **APENAS Production**
   - ❌ NÃO marque Preview ou Development

4. **NODE_ENV:**
   - Digite: `production`
   - Marque: ☑️ Production

### 4.4 Configurações de Build

A Vercel detecta Next.js automaticamente. Confirme:

- **Framework Preset:** Next.js
- **Root Directory:** `./` (raiz do projeto)
- **Build Command:** `npm run build` (ou deixe vazio para padrão)
- **Output Directory:** `.next` (ou deixe vazio para padrão)
- **Install Command:** `npm install` (ou deixe vazio para padrão)

### 4.5 Iniciar Deploy

1. Revise todas as configurações
2. Clique em **Deploy**
3. Aguarde o build completar (2-5 minutos)

**Durante o deploy, você verá:**
- ⏳ Building... (instalando dependências)
- ⏳ Building... (executando `npm run build`)
- ⏳ Uploading... (fazendo upload dos arquivos)
- ✅ Ready! (deploy concluído)

**Se o deploy falhar:**
- Clique em **View Function Logs**
- Identifique o erro
- Corrija localmente
- Faça commit e push (a Vercel fará redeploy automático)

---

## ✅ Passo 5: Verificação Pós-Deploy

### 5.1 Acessar a Aplicação

Após deploy bem-sucedido, você receberá uma URL:
```
https://seu-projeto.vercel.app
```

1. Clique na URL ou copie e cole no navegador
2. A página inicial deve carregar corretamente

### 5.2 Testar Funcionalidades Principais

Execute este checklist completo:

#### Módulo de Produtos
- [ ] Acessar página de Produtos (`/products`)
- [ ] Buscar produto por código (ex: `PH4701`)
- [ ] Buscar produto por aplicação
- [ ] Verificar se equivalências aparecem nos resultados
- [ ] Verificar se nome do grupo aparece (ex: FRAM, BOSCH)
- [ ] Testar paginação dos resultados

#### Módulo de Clientes
- [ ] Acessar página de Clientes (`/clients`)
- [ ] Buscar cliente por nome
- [ ] Buscar cliente por CNPJ
- [ ] Criar novo cliente
- [ ] Editar cliente existente
- [ ] Verificar se dados são salvos corretamente

#### Módulo de Pedidos
- [ ] Acessar página de Pedidos (`/orders`)
- [ ] Criar novo pedido
- [ ] Selecionar cliente
- [ ] Adicionar produtos ao pedido
- [ ] Verificar cálculo de subtotais
- [ ] Aplicar desconto
- [ ] Verificar cálculo final com desconto
- [ ] Adicionar taxa de frete
- [ ] Salvar pedido
- [ ] Visualizar pedidos na lista
- [ ] Filtrar pedidos por data
- [ ] Filtrar pedidos por status
- [ ] Ver detalhes de um pedido

#### Módulo de Importação (Admin)
- [ ] Acessar página de Importação (`/admin/import` ou similar)
- [ ] Fazer upload de arquivo Excel com produtos
- [ ] Verificar se produtos foram importados
- [ ] Verificar se dados estão corretos no banco

### 5.3 Verificar Logs e Erros

#### A) Verificar Function Logs na Vercel

1. Vá em **Deployments** → Clique no deploy atual
2. Clique em **View Function Logs**
3. Interaja com a aplicação e monitore os logs
4. **Não deve haver erros 500 ou warnings críticos**

#### B) Verificar API Logs no Supabase

1. Acesse Supabase Dashboard
2. Vá em **Logs** → **API Logs**
3. Use a aplicação e observe as requisições
4. **Verifique se não há erros de permissão (RLS)**

#### C) Verificar Database Logs no Supabase

1. Vá em **Logs** → **Database Logs**
2. **Não deve haver constraint violations ou errors**

### 5.4 Testar Segurança (RLS)

Se você tiver múltiplos usuários:

1. Crie dois usuários de teste
2. Faça login com usuário A
3. Crie um cliente para usuário A
4. Faça logout e login com usuário B
5. **Verificar:** Usuário B NÃO deve ver o cliente de A
6. Repita para pedidos

### 5.5 Testar Performance

Use as ferramentas de desenvolvedor do navegador:

```bash
# Abra DevTools (F12)
# Vá em Network
# Carregue a página de produtos
# Verifique:
```

- [ ] Tempo de carregamento inicial < 3 segundos
- [ ] Requisições API respondem em < 1 segundo
- [ ] Sem requisições falhando (status 400/500)
- [ ] Imagens carregando corretamente

---

## 🔧 Passo 6: Configurações Adicionais

### 6.1 Configurar URL de Callback no Supabase

No painel do Supabase:

1. Vá em **Authentication** → **URL Configuration**
2. Em **Site URL**, adicione: `https://seu-projeto.vercel.app`
3. Em **Redirect URLs**, adicione:
   ```
   https://seu-projeto.vercel.app
   https://seu-projeto.vercel.app/**
   https://seu-projeto.vercel.app/auth/callback
   ```
4. Clique em **Save**

### 6.2 Domínio Customizado (Opcional)

Se você tem um domínio próprio:

1. Na Vercel, vá em **Settings** → **Domains**
2. Clique em **Add Domain**
3. Digite seu domínio (ex: `meuapp.com.br`)
4. Configure os registros DNS conforme instruções:
   ```
   Type: A
   Name: @
   Value: 76.76.21.21

   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   ```
5. Aguarde propagação DNS (pode levar até 48h)

### 6.3 Habilitar Analytics (Opcional)

Na Vercel:

1. Vá em **Analytics** (menu lateral)
2. Clique em **Enable Web Analytics**
3. Monitore:
   - Pageviews
   - Top pages
   - Top referrers
   - Devices e browsers

### 6.4 Configurar Speed Insights (Opcional)

1. Vá em **Speed Insights**
2. Clique em **Enable**
3. Monitore Core Web Vitals:
   - LCP (Largest Contentful Paint)
   - FID (First Input Delay)
   - CLS (Cumulative Layout Shift)

### 6.5 Configurar Notificações

1. Vá em **Settings** → **Notifications**
2. Habilite alertas para:
   - ✅ Deployment Failed
   - ✅ Deployment Ready
   - ✅ Performance Issues
3. Configure Slack/Discord/Email conforme preferência

---

## 🐛 Troubleshooting - Problemas Comuns

### 🔴 Erro: "SUPABASE_URL is not defined"

**Sintoma:** Aplicação não carrega, erro no console do navegador

**Causa:** Variável de ambiente não configurada ou com nome errado

**Solução:**
1. Vá em Vercel → Settings → Environment Variables
2. Verifique se `NEXT_PUBLIC_SUPABASE_URL` existe
3. Confirme que o nome está EXATAMENTE correto (case-sensitive)
4. Se estiver faltando, adicione e faça redeploy
5. **Importante:** Variáveis `NEXT_PUBLIC_*` devem estar em todos ambientes

### 🔴 Erro: "Failed to fetch products" ou 400 Bad Request

**Sintoma:** Busca de produtos não funciona

**Causas possíveis:**
1. URL do Supabase incorreta
2. Chave anon incorreta
3. Query malformada

**Solução:**
```bash
# Teste as credenciais localmente primeiro
# Crie .env.local com:
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-aqui

# Teste local
npm run dev

# Se funcionar local mas não em produção:
# → Verifique as variáveis na Vercel
# → Confirme que não há espaços extras nas chaves
```

### 🔴 Erro: Foreign Key Constraint Violation

**Sintoma:** Erro ao criar pedidos: `23503: foreign key constraint violation`

**Causa:** Tipo de `product_id` incompatível

**Solução:**
```sql
-- Execute no SQL Editor do Supabase:
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'order_items' AND column_name = 'product_id';

-- Se não for BIGINT, execute a migração:
-- fix_order_items_product_id_type
```

### 🔴 Erro: RLS Policy Violation

**Sintoma:** `Row-level security policy violation` ao acessar dados

**Causa:** Políticas RLS muito restritivas ou ausentes

**Solução:**
```sql
-- Verifique se RLS está habilitado
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('products', 'orders', 'clients');

-- Se necessário, crie políticas permissivas temporariamente:
CREATE POLICY "Allow public read access" ON products
  FOR SELECT USING (true);
```

### 🔴 Build Falhou: TypeScript Errors

**Sintoma:** Deploy falha com erros de tipo TypeScript

**Solução:**
```bash
# Teste o build localmente
npm run build

# Corrija todos os erros de tipo
# Depois faça commit e push
git add .
git commit -m "fix: corrigir erros de TypeScript"
git push origin main
```

### 🔴 Build Falhou: Missing Dependencies

**Sintoma:** `Module not found` durante build

**Solução:**
```bash
# Verifique package.json
# Instale dependências faltando
npm install nome-do-pacote

# Commit o package.json atualizado
git add package.json package-lock.json
git commit -m "fix: adicionar dependência faltante"
git push
```

### 🔴 Importação de Produtos Falha

**Sintoma:** Upload de Excel não funciona

**Causas possíveis:**
1. `SUPABASE_SERVICE_ROLE_KEY` não configurada
2. Arquivo Excel malformado
3. Falta de produto_groups

**Solução:**
1. Confirme que `SUPABASE_SERVICE_ROLE_KEY` está em **Production** na Vercel
2. Verifique formato do Excel (deve ter colunas corretas)
3. Execute:
```sql
-- Confirme que há product_groups
SELECT COUNT(*) FROM product_groups;
-- Resultado esperado: 38
```

### 🔴 Performance Lenta

**Sintoma:** Páginas demoram muito para carregar

**Soluções:**

1. **Habilitar caching no Supabase:**
```javascript
// Em queries repetitivas, adicione:
.select('*')
.range(0, 49)
.order('product')
.abortSignal(AbortSignal.timeout(5000)) // Timeout de 5s
```

2. **Otimizar queries:**
```sql
-- Criar índices nas colunas mais buscadas
CREATE INDEX IF NOT EXISTS idx_products_search
ON products USING GIN (to_tsvector('portuguese', product || ' ' || COALESCE(application, '')));
```

3. **Verificar na Vercel:**
- Analytics → Identificar páginas lentas
- Speed Insights → Ver Core Web Vitals

---

## 🔄 Atualizações e Manutenção

### Deploy Automático (Configurado por padrão)

Após o deploy inicial, atualizações são **automáticas**:

```bash
# 1. Faça alterações no código
# 2. Commit local
git add .
git commit -m "feat: nova funcionalidade"

# 3. Push para GitHub
git push origin main

# 4. Vercel detecta e faz deploy automaticamente!
```

### Deploy Manual (Se necessário)

Na Vercel Dashboard:
1. Vá em **Deployments**
2. Clique em **Redeploy** no último deploy
3. Escolha **Use existing build cache** (mais rápido) ou **Rebuild** (se houve mudanças de dependências)

### Rollback (Voltar versão anterior)

Se um deploy quebrou algo:

1. Na Vercel, vá em **Deployments**
2. Encontre o último deploy funcional
3. Clique nos três pontos **•••**
4. Clique em **Promote to Production**
5. Confirme o rollback

### Deploy de Branch de Staging (Opcional)

Para testar antes de produção:

```bash
# Criar branch staging
git checkout -b staging

# Fazer alterações e commit
git add .
git commit -m "test: testar nova feature"

# Push do branch
git push origin staging
```

Na Vercel:
1. Vá em **Settings** → **Git**
2. Em **Production Branch**, mantenha `main`
3. Em **Preview Branches**, marque **All branches**
4. Agora todo push em `staging` cria uma URL de preview

---

## 📊 Monitoramento de Custos e Limites

### Vercel - Plano Hobby (Grátis)

Limites mensais:
- ✅ 100GB de bandwidth
- ✅ 100 horas de execução serverless (6.000 minutos)
- ✅ Builds ilimitados
- ✅ Deploys ilimitados
- ✅ 1 usuário (você)
- ⚠️ Domínio customizado limitado

**Como monitorar:**
- Vá em **Usage** → Ver consumo atual
- Configure alertas em 80% do limite

### Supabase - Plano Free

Limites mensais:
- ✅ 500MB de banco de dados
- ✅ 1GB de storage
- ✅ 2GB de transferência
- ✅ 50.000 usuários ativos mensais (MAU)
- ✅ 500MB de Edge Function storage

**Como monitorar:**
- Dashboard → **Usage** → Ver métricas
- Configure alertas para 80% dos limites

### Quando Fazer Upgrade?

**Vercel Pro ($20/mês):**
- Ultrapassou 100GB/mês de bandwidth
- Precisa de mais de 400 horas serverless/mês
- Quer múltiplos domínios customizados
- Quer autenticação de equipe

**Supabase Pro ($25/mês):**
- Banco cresceu além de 500MB
- Precisa de backups automáticos
- Quer suporte prioritário
- Tráfego ultrapassou 2GB/mês

---

## 📝 Checklist Final de Deploy

Use este checklist para garantir que tudo está configurado:

### Pré-Deploy
- [ ] Token Supabase antigo revogado
- [ ] Novas credenciais anotadas (URL + anon + service_role)
- [ ] Build local funcionando (`npm run build`)
- [ ] .gitignore atualizado (sem arquivos sensíveis)
- [ ] Código no GitHub atualizado

### Supabase
- [ ] Todas as 9 migrações aplicadas
- [ ] 38 product_groups inseridos
- [ ] Descontos cadastrados
- [ ] Payment conditions cadastradas
- [ ] RLS habilitado em todas as tabelas
- [ ] Políticas RLS criadas

### Vercel
- [ ] Conta criada e GitHub conectado
- [ ] Projeto importado
- [ ] `NEXT_PUBLIC_SUPABASE_URL` configurada (todos ambientes)
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` configurada (todos ambientes)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` configurada (APENAS production)
- [ ] `NODE_ENV=production` configurada
- [ ] Deploy bem-sucedido (status verde)

### Pós-Deploy
- [ ] URL de produção acessível
- [ ] Busca de produtos funcionando
- [ ] CRUD de clientes funcionando
- [ ] Criação de pedidos funcionando
- [ ] Importação de produtos funcionando (Admin)
- [ ] Logs sem erros críticos (Vercel + Supabase)
- [ ] Performance aceitável (< 3s carregamento)
- [ ] URL de callback configurada no Supabase

### Opcional
- [ ] Domínio customizado configurado
- [ ] Analytics habilitado
- [ ] Speed Insights habilitado
- [ ] Notificações configuradas
- [ ] Backups automáticos configurados (Supabase Pro)

---

## 🆘 Suporte e Recursos

### Documentação Oficial

- **Next.js:** https://nextjs.org/docs/deployment
- **Vercel:** https://vercel.com/docs
- **Supabase:** https://supabase.com/docs
- **TypeScript:** https://www.typescriptlang.org/docs

### Comunidades

- **Vercel Discord:** https://vercel.com/discord
- **Supabase Discord:** https://discord.supabase.com
- **Next.js Discussions:** https://github.com/vercel/next.js/discussions

### Ferramentas de Debug

- **Vercel Function Logs:** Para debug de API routes e server components
- **Supabase SQL Editor:** Para queries de debug no banco
- **Browser DevTools:** Para debug de frontend e network
- **Vercel CLI:** Para deploy local e debug
  ```bash
  npm i -g vercel
  vercel dev  # Simula ambiente Vercel localmente
  ```

---

## 🎉 Parabéns!

Sua aplicação **Stock Portfolio Demo** está no ar! 🚀

### Próximos Passos

1. **Compartilhe a URL** com sua equipe
2. **Importe produtos** via Excel (Admin)
3. **Cadastre clientes** e comece a usar
4. **Monitore métricas** de uso e performance
5. **Itere e melhore** baseado no feedback

**URL de Produção:** `https://seu-projeto.vercel.app`

---

**📅 Última atualização:** 2025-01-07
**✍️ Versão:** 2.0 (Guia Completo)
**📧 Suporte:** Consulte a documentação oficial ou comunidades
