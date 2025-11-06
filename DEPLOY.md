# 🚀 Guia de Deploy - Stock Portfolio Demo

Este guia orienta o processo completo de deploy da aplicação para produção usando Vercel.

## 📋 Pré-requisitos

Antes de iniciar o deploy, certifique-se de ter:

- [ ] Conta no [Vercel](https://vercel.com)
- [ ] Conta no [Supabase](https://supabase.com) com projeto criado
- [ ] Repositório no GitHub com o código
- [ ] Token do Supabase revogado (se foi exposto anteriormente)

---

## 🔒 Passo 1: Segurança - Revogar Token Exposto

**IMPORTANTE:** Se você clonou este repositório, o token do Supabase foi exposto no commit `ac715c3`. Você **DEVE** revogá-lo antes de continuar:

1. Acesse: https://supabase.com/dashboard/project/qxgzwaqjphujlkrcjgfq/settings/api
2. Vá em **Project API keys** ou **Service Role Key**
3. Clique em **Reset/Regenerate** para o token correspondente
4. Copie o novo token gerado

---

## 🗄️ Passo 2: Configurar Supabase

### 2.1 Obter Credenciais

No painel do Supabase, vá em **Settings** → **API** e copie:

- `NEXT_PUBLIC_SUPABASE_URL`: A URL do projeto
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: A chave pública (anon key)
- `SUPABASE_SERVICE_ROLE_KEY`: A chave de serviço (service role key)

### 2.2 Executar Migrações

Execute as migrações SQL do banco de dados:

```bash
# Opção 1: Via Supabase CLI
npx supabase db push

# Opção 2: Manualmente via painel do Supabase
# Vá em SQL Editor e execute os arquivos de /supabase/migrations/
```

### 2.3 Configurar RLS (Row Level Security)

Certifique-se de que as políticas RLS estão ativas para:
- `clients` - Usuários só veem seus próprios clientes
- `orders` - Usuários só veem seus próprios pedidos
- `products` - Todos podem visualizar, apenas admin pode modificar

---

## 📤 Passo 3: Push para GitHub

```bash
# Verificar status
git status

# Fazer push dos commits de segurança
git push origin main
```

---

## 🌐 Passo 4: Deploy na Vercel

### 4.1 Importar Projeto

1. Acesse [vercel.com/new](https://vercel.com/new)
2. Clique em **Import Git Repository**
3. Selecione seu repositório do GitHub
4. Clique em **Import**

### 4.2 Configurar Variáveis de Ambiente

Na tela de configuração do projeto, adicione as seguintes variáveis:

| Nome | Valor | Descrição |
|------|-------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIs...` | Chave pública do Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOiJIUzI1NiIs...` | Chave de serviço (SECRET!) |
| `NODE_ENV` | `production` | Ambiente de execução |
| `NEXT_PUBLIC_APP_URL` | `https://seu-app.vercel.app` | URL da aplicação |

**⚠️ IMPORTANTE:** Mantenha a `SUPABASE_SERVICE_ROLE_KEY` como **secreta**!

### 4.3 Configurações do Build

A Vercel detectará automaticamente o Next.js. Verifique se está configurado:

- **Framework Preset**: Next.js
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`

### 4.4 Deploy

1. Clique em **Deploy**
2. Aguarde o build completar (2-3 minutos)
3. Acesse a URL fornecida pela Vercel

---

## ✅ Passo 5: Verificação Pós-Deploy

Após o deploy bem-sucedido, teste:

### 5.1 Funcionalidades Básicas

- [ ] Login funciona
- [ ] Dashboard carrega
- [ ] Pode criar/editar clientes
- [ ] Pode criar/editar produtos
- [ ] Pode criar pedidos
- [ ] Totais são calculados corretamente

### 5.2 Segurança

- [ ] RLS está funcionando (usuários não veem dados de outros)
- [ ] Apenas admin pode acessar funções administrativas
- [ ] Sessões expiram corretamente

### 5.3 Performance

- [ ] Páginas carregam rapidamente (<2s)
- [ ] Imagens otimizadas
- [ ] APIs respondem em tempo hábil

---

## 🔧 Passo 6: Configurações Adicionais

### 6.1 Domínio Customizado (Opcional)

1. Vá em **Settings** → **Domains**
2. Adicione seu domínio personalizado
3. Configure os registros DNS conforme instruído

### 6.2 Analytics (Opcional)

Habilite Vercel Analytics:
1. Vá em **Analytics**
2. Clique em **Enable**

### 6.3 Logs e Monitoramento

- **Logs**: Acesse em **Deployments** → **View Function Logs**
- **Erros**: Integre com Sentry (opcional)

---

## 🐛 Troubleshooting

### Erro: "SUPABASE_URL is not defined"

**Solução:** Certifique-se de que todas as variáveis de ambiente foram adicionadas na Vercel.

### Erro: "Authentication failed"

**Solução:** Verifique se o `SUPABASE_ANON_KEY` está correto.

### Erro de RLS: "Row-level security policy violation"

**Solução:**
1. Verifique se as políticas RLS estão ativas no Supabase
2. Execute as migrações SQL novamente

### Build falhou

**Solução:**
1. Verifique os logs de build na Vercel
2. Teste o build localmente: `npm run build`
3. Corrija erros e faça commit

---

## 🔄 Atualizações Futuras

Após o deploy inicial, atualizações são automáticas:

1. Faça commit das mudanças localmente
2. Push para GitHub: `git push origin main`
3. Vercel detecta o push e faz deploy automaticamente

### Deploy de Branch (Opcional)

Crie um branch de staging:

```bash
git checkout -b staging
git push origin staging
```

Na Vercel, configure para fazer deploy automático de branches também.

---

## 📊 Monitoramento de Custos

### Vercel (Plano Hobby - Grátis)

- 100GB de bandwidth/mês
- 100 horas de execução serverless/mês
- Builds ilimitados

### Supabase (Plano Free)

- 500MB de banco de dados
- 1GB de transferência de arquivo
- 50.000 usuários ativos/mês

**⚠️ Monitore o uso regularmente!**

---

## 📝 Checklist Final de Deploy

- [ ] Token do Supabase antigo revogado
- [ ] Novas credenciais geradas
- [ ] Migrações SQL executadas
- [ ] RLS configurado corretamente
- [ ] Código no GitHub atualizado
- [ ] Variáveis de ambiente configuradas na Vercel
- [ ] Deploy bem-sucedido
- [ ] Testes pós-deploy passaram
- [ ] Domínio configurado (se aplicável)
- [ ] Monitoramento ativo

---

## 🆘 Suporte

Se encontrar problemas:

1. **Logs da Vercel**: Deployments → View Function Logs
2. **Logs do Supabase**: Logs & Reports
3. **Documentação**:
   - [Vercel Docs](https://vercel.com/docs)
   - [Supabase Docs](https://supabase.com/docs)
   - [Next.js Docs](https://nextjs.org/docs)

---

## 🎉 Parabéns!

Sua aplicação está no ar! Compartilhe a URL e comece a usar.

**URL de Produção:** `https://seu-app.vercel.app`

---

**Última atualização:** 2025-01-06
