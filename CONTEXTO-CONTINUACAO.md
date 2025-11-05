# 📋 CONTEXTO DO PROJETO - Conversão para Portfolio

**Data:** 05 de Novembro de 2025
**Projeto Original:** stock-santospenedo (PRODUÇÃO - NÃO MODIFICAR)
**Projeto Portfolio:** stock-portfolio-demo (EM DESENVOLVIMENTO)

---

## 🎯 OBJETIVO DO PROJETO

Transformar o sistema de gestão de estoque **Santos & Penedo e Cia LTDA** (em produção) em uma versão **demo sanitizada para portfolio**, preservando 100% dos dados do cliente enquanto demonstra as habilidades técnicas do desenvolvedor.

---

## ✅ O QUE JÁ FOI FEITO

### Etapa 1: Criação do Diretório Portfolio ✅ COMPLETO

1. ✅ Projeto copiado de `~/projects/stock-santospenedo` para `~/projects/stock-portfolio-demo`
2. ✅ Histórico git removido completamente (sem commits do cliente)
3. ✅ Novo repositório git inicializado (limpo)
4. ✅ Arquivos `.env` e `.env.demo` deletados (credenciais de produção removidas)
5. ✅ Cache `.next` e `node_modules` limpos (tamanho reduzido de 887MB para 3.3MB)

**Localização atual:**
- **Projeto Cliente (INTOCADO):** `/home/joelson/projects/stock-santospenedo`
- **Projeto Portfolio (TRABALHAR AQUI):** `/home/joelson/projects/stock-portfolio-demo`

---

## 📊 ANÁLISE COMPLETA DE SEGURANÇA REALIZADA

### 🔴 CRÍTICO - Identificados e Localizados:

#### 1. Credenciais de Produção (REMOVIDAS)
```bash
❌ NEXT_PUBLIC_SUPABASE_URL=https://xoszclysnrybyqltybik.supabase.co
❌ NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
❌ SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
❌ SUPABASE_ACCESS_TOKEN=sbp_22f70...
```
**Status:** ✅ Arquivos .env deletados no projeto portfolio

#### 2. Nome da Empresa do Cliente
**Substituir:** "Santos & Penedo" → "Demo Parts Co." ou similar

**Arquivos que precisam alteração (8 locais identificados):**
```
1. src/presentation/components/layout/Header.tsx (linhas 157, 255)
2. src/app/layout.tsx (linha 10 - metadata title)
3. src/app/(auth)/login/page.tsx (linha 81)
4. README.md (múltiplas referências)
5. docs/*.md (vários arquivos de documentação)
6. supabase/migrations/*.sql (comentários)
```

#### 3. Descrição de Produtos do Cliente
**Substituir:** "Filtros • Palhetas • Óleos Lubrificantes" → "Automotive Parts & Supplies"

**Locais:**
- Header.tsx (linha 160)
- layout.tsx (linha 12 - metadata description)
- login/page.tsx (linha 84)

#### 4. Informações Pessoais do Desenvolvedor
```typescript
// src/presentation/components/orders/OrderPrintTemplate.ts (linha 798)
❌ "Desenvolvido por <a href='https://www.linkedin.com/in/joelsonlopes/'>Joelson Lopes</a>"
✅ Trocar para: "System Generated" ou remover
```

**Git commits:**
- Autor: JoelsonLopes <joelsonlopes85@gmail.com>
- ✅ Histórico já foi removido no projeto portfolio

---

## 🛠️ STACK TÉCNICA IDENTIFICADA

### Tecnologias Principais:
- **Framework:** Next.js 15.2.4 (App Router)
- **Linguagem:** TypeScript 5
- **Arquitetura:** Clean Architecture (Domain, Application, Infrastructure)
- **Database:** PostgreSQL via Supabase
- **Autenticação:** Sistema dual (Custom + Supabase Auth)
- **Deploy:** Vercel

### Frontend:
- React 18
- Tailwind CSS
- Radix UI + shadcn/ui
- TanStack Query (React Query)
- React Hook Form + Zod

### Features:
- PDF Generation (jsPDF + html2pdf.js)
- Excel Export (xlsx)
- Dashboard com estatísticas
- Gestão de produtos, clientes, pedidos
- Sistema de descontos e comissões
- Importação inteligente de dados

### Segurança Implementada:
- ✅ Row Level Security (RLS) em todas as tabelas
- ✅ Bcrypt para hash de senhas
- ✅ Validação de sessão
- ✅ Rotas protegidas via middleware

---

## 📋 ESTRUTURA DO BANCO DE DADOS

### Tabelas Principais (Supabase/PostgreSQL):
```sql
- custom_users          # Usuários do sistema (com senhas hash)
- products              # Catálogo de produtos
- equivalences          # Códigos equivalentes de produtos
- clients               # Base de clientes (inclui CNPJ)
- orders                # Pedidos de venda
- order_items           # Itens dos pedidos
- discounts             # Regras de desconto
- payment_conditions    # Condições de pagamento
- product_groups        # Categorização de produtos
```

### Observação Importante:
- ⚠️ Não há dados reais de clientes no repositório (apenas schema)
- ⚠️ Campo `cnpj` existe mas está vazio no código
- ✅ Seed de dados demo precisa ser criado com CNPJs fictícios

---

## 🎯 PLANO DE SANITIZAÇÃO COMPLETO

### FASE 2: Sanitização de Código (PRÓXIMA ETAPA - 3-4h estimadas)

#### 2.1 Script de Substituição Automática
**Criar:** `scripts/sanitize-portfolio.sh`

Substituições necessárias:
```bash
# Nome da empresa
"Santos & Penedo" → "Demo Parts Co."
"Santos & Penedo e Cia LTDA" → "Demo Parts Distributor Inc."

# Descrição de produtos
"Filtros • Palhetas • Óleos Lubrificantes" → "Automotive Parts & Supplies"

# Links pessoais
"linkedin.com/in/joelsonlopes" → "example.com/demo"
"joelsonlopes85@gmail.com" → (remover ou usar genérico)
```

#### 2.2 Arquivos a Criar:
- [ ] `scripts/sanitize-portfolio.sh` - Script de sanitização automática
- [ ] `.env.example` - Template de variáveis de ambiente
- [ ] `scripts/seed-demo-data.sql` - Dados fictícios para demo
- [ ] `PORTFOLIO.md` - Documentação para recrutadores
- [ ] `MIGRATION_GUIDE.md` - Guia passo-a-passo de setup

#### 2.3 Componente Demo Banner
**Criar:** `src/presentation/components/demo/DemoBanner.tsx`
- Banner visual indicando "🎨 DEMO VERSION - Portfolio Showcase"
- Watermark em PDFs gerados

---

### FASE 3: Banco de Dados Demo (2-3h estimadas)

#### 3.1 Novo Projeto Supabase
- [ ] Criar projeto FREE no Supabase para demo
- [ ] Salvar novas credenciais:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`

#### 3.2 Migração e Seed
- [ ] Executar migrations no novo projeto Supabase
- [ ] Criar script de seed com dados fictícios:
  - 50-100 produtos genéricos de autopeças
  - 10-15 clientes fictícios (CNPJs falsos válidos)
  - 20-30 pedidos de exemplo
  - Usuário demo: `demo` / senha: `Demo123!`

**Ferramentas sugeridas:** Faker.js ou dados manuais

---

### FASE 4: Documentação Portfolio (1-2h estimadas)

#### 4.1 README.md Atualizado
Adicionar seções:
- 🎨 **Disclaimer:** "Demo/Portfolio Version"
- 🚀 **Features:** Lista completa de funcionalidades
- 🛠️ **Tech Stack:** Arquitetura e tecnologias
- 📦 **Setup:** Instruções de instalação
- 🔑 **Demo Credentials:** `demo / Demo123!`
- 📸 **Screenshots:** Com dados genéricos

#### 4.2 PORTFOLIO.md (Novo arquivo)
Documentação específica para recrutadores:
- Contexto do projeto
- Desafios técnicos resolvidos
- Decisões arquiteturais
- Highlights técnicos:
  - Clean Architecture
  - Row Level Security
  - Sistema de importação inteligente
  - Geração de PDF/Excel
  - Dashboard em tempo real

---

### FASE 5: Deploy e Publicação (1h estimada)

#### 5.1 Novo Repositório GitHub
```bash
cd ~/projects/stock-portfolio-demo
git add .
git commit -m "Initial commit - Portfolio demo version"
git remote add origin https://github.com/[seu-user]/stock-management-demo
git push -u origin main
```

**Nome sugerido:** `stock-management-demo` ou `automotive-erp-demo`

#### 5.2 Deploy Vercel Separado
- Criar novo projeto Vercel
- Configurar env vars do Supabase demo
- URL demo: `stock-demo.vercel.app`

#### 5.3 Adicionar ao Portfolio Pessoal
- Link GitHub público
- Link demo live com credenciais
- Screenshots e descrição

---

## ⏱️ ESTIMATIVA DE TEMPO TOTAL

| Fase | Estimativa | Status |
|------|-----------|--------|
| 1. Criação do diretório | 30min | ✅ COMPLETO |
| 2. Sanitização de código | 3-4h | ⏳ PRÓXIMO |
| 3. Database demo | 2-3h | ⏳ PENDENTE |
| 4. Documentação | 1-2h | ⏳ PENDENTE |
| 5. Deploy | 1h | ⏳ PENDENTE |
| **TOTAL** | **8-12h** | **10% Completo** |

---

## 🚀 PRÓXIMOS PASSOS IMEDIATOS

### O que fazer agora no novo chat:

1. **Abrir o projeto portfolio:**
   ```bash
   cd ~/projects/stock-portfolio-demo
   code .
   ```

2. **Copiar e colar este arquivo completo** no novo chat do Claude

3. **Solicitar:** "Continue de onde parou - criar os scripts de sanitização"

4. **Ordem de execução sugerida:**
   - [ ] Criar script `sanitize-portfolio.sh`
   - [ ] Criar `.env.example`
   - [ ] Executar sanitização (substituir nomes)
   - [ ] Criar componente DemoBanner
   - [ ] Atualizar README.md
   - [ ] Criar PORTFOLIO.md
   - [ ] Criar MIGRATION_GUIDE.md

---

## 🔒 CHECKLIST DE SEGURANÇA FINAL

Antes de publicar, verificar:

- [ ] ❌ Nenhuma credencial de produção no código
- [ ] ❌ Nenhuma referência a "Santos & Penedo"
- [ ] ❌ Nenhum CNPJ real nos dados
- [ ] ❌ Nenhum dado pessoal do desenvolvedor
- [ ] ✅ Novo Supabase project configurado
- [ ] ✅ `.env` não commitado (apenas `.env.example`)
- [ ] ✅ README com disclaimer de demo
- [ ] ✅ Deploy em Vercel separado
- [ ] ✅ Repositório original privado/protegido

---

## 📝 ARQUIVOS CRIADOS ATÉ AGORA

Neste diretório (`~/projects/stock-portfolio-demo`):

1. ✅ `CONTEXTO-CONTINUACAO.md` - Este arquivo (contexto completo)

**Ainda serão criados:**
- `scripts/sanitize-portfolio.sh`
- `.env.example`
- `scripts/seed-demo-data.sql`
- `PORTFOLIO.md`
- `MIGRATION_GUIDE.md`
- `src/presentation/components/demo/DemoBanner.tsx`

---

## 💡 COMANDOS ÚTEIS

### Verificar diferenças entre projetos:
```bash
# Ver tamanho dos projetos
du -sh ~/projects/stock-santospenedo
du -sh ~/projects/stock-portfolio-demo

# Verificar se .env existe (não deve existir no portfolio)
ls -la ~/projects/stock-portfolio-demo/.env*
```

### Buscar referências ao cliente:
```bash
cd ~/projects/stock-portfolio-demo
grep -r "Santos & Penedo" --include="*.ts" --include="*.tsx" --include="*.md"
grep -r "Filtros.*Palhetas.*Óleos" --include="*.ts" --include="*.tsx"
```

### Verificar git status:
```bash
cd ~/projects/stock-portfolio-demo
git status
git log  # Deve estar vazio (sem commits do cliente)
```

---

## 🎯 RESULTADO ESPERADO FINAL

Após completar todas as fases, você terá:

✅ **Projeto Original:** Intocado e seguro
✅ **Projeto Portfolio:** Sanitizado e público
✅ **GitHub:** Repositório público com código limpo
✅ **Demo Live:** Deploy funcional com dados fictícios
✅ **Documentação:** README + PORTFOLIO.md profissionais
✅ **Showcase:** Demonstração completa de habilidades técnicas

### Recrutadores verão:
- Clean Architecture na prática
- Next.js 15 + TypeScript moderno
- Supabase/PostgreSQL com RLS
- Sistema ERP completo e funcional
- Código profissional e bem documentado

---

## 📞 INFORMAÇÕES IMPORTANTES

**Desenvolvedor Original:** Joelson Lopes
**Cliente:** Santos & Penedo e Cia LTDA (informação CONFIDENCIAL)
**Projeto em Produção:** SIM - sistema ativo e em uso
**Objetivo:** Portfolio sem expor dados do cliente

---

## ⚠️ AVISOS FINAIS

1. **NUNCA** commite o arquivo `.env` no git
2. **SEMPRE** use o diretório `stock-portfolio-demo` para modificações
3. **TESTE** o sistema demo completamente antes de publicar
4. **VERIFIQUE** se não há CNPJs ou dados reais nos seeds
5. **ROTACIONE** as credenciais de produção após criar o demo (opcional, mas recomendado)

---

**🎯 CONTINUE DE ONDE PARAMOS:**

```
"Olá Claude! Estou continuando o projeto de conversão para portfolio.
Acabei de abrir o projeto em ~/projects/stock-portfolio-demo.
Li o arquivo CONTEXTO-CONTINUACAO.md completo.
A Fase 1 está completa (diretório criado e git inicializado).
Vamos começar a Fase 2: criar os scripts de sanitização.
Por favor, crie o script sanitize-portfolio.sh primeiro."
```

---

**Data de criação deste arquivo:** 05/11/2025
**Última atualização:** 05/11/2025 - 15:35
**Versão:** 1.0

---

✨ **Boa sorte com a continuação do projeto!** ✨
