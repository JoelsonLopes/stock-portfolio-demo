# Guia de Importação de Produtos

Este documento descreve como importar produtos no sistema, os formatos aceitos, tratamentos de dados (sanitização), e a configuração do novo campo de grupo.

## Visão Geral

- Tabela destino: `public.products`
- Novo relacionamento: `public.products.group_id` → FK para `public.product_groups(id)`
- Compatibilidade garantida: o sistema aceita o formato antigo (sem grupo) e o novo (com grupo)

## Tabela de Grupos

`public.product_groups`

```sql
create table if not exists public.product_groups (
  id smallint primary key,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

-- Exemplo: incluir/atualizar grupo
insert into public.product_groups (id, name)
values (99, 'FRETEs')
on conflict (id) do update set name = excluded.name;
```

`public.products` (adições relevantes)

```sql
alter table public.products add column if not exists group_id smallint;
-- FK criada com verificação para evitar erro quando já existir
```

## Formatos aceitos

1) Antigo (4 colunas)

```
product;stock;price;application
WO121;342;17.52;FIAT UNO 1.3 FLEX 2017 > FIAT MOBI 1.0 FLEX 2017 >
```

2) Novo (5 colunas com grupo)

```
group;product;stock;price;application
36;WO121;342;17.52;FIAT UNO 1.3 FLEX 2017 > FIAT MOBI 1.0 FLEX 2017 >
```

Notas:
- Separador pode ser `;` ou `,` (detecção automática)
- `application` pode conter `;`. O parser recombina as partes restantes
- `group` é numérico. Zeros à esquerda são removidos (ex.: `01` → `1`)

## Regras de validação e sanitização

- Remoção de caracteres de controle em `product`/`application`: `[
  \x00-\x1F\x7F
]`
- `product`: obrigatório
- `stock`: inteiro entre `0` e `2_147_483_647`
- `price`: `0` a `99_999_999.99` (2 casas, aceita vírgula ou ponto)
- `application`: até 1000 caracteres (opcional)
- `group_id`: opcional, `smallint` (0–32767)
- FK: se `group_id` não existir em `public.product_groups`, o banco retorna erro `23503`

## Endpoints

Recomendado: `POST /api/products/smart-import`

Payload:

```json
{
  "strategy": "upsert_by_name",
  "products": [
    { "group_id": 36, "product": "WO121", "stock": 342, "price": 17.52, "application": "..." },
    { "product": "PSL545", "stock": 10, "price": 22.20 }
  ]
}
```

Outros endpoints:

- `POST /api/products/import` (insert em lote)
- `POST /api/products/bulk-import` (texto CSV/TXT; detecta 4/5 colunas)
- `POST /api/products/sql-import` (INSERT simples com salvaguardas)

## UI – Importar CSV/TXT

- Preview das primeiras linhas
- Importa formatos 4 ou 5 colunas
- Opção de UPSERT por nome para evitar duplicatas
- Exibe estatísticas (inseridos/atualizados/sem alteração)

## Boas práticas

- Cadastrar/atualizar grupos em `public.product_groups` antes de importar
- Limpar caracteres ocultos em arquivos de origem (o sistema sanitiza, mas é melhor evitar)
- Garantir que `product` não esteja vazio

## Geração de tipos (opcional)

```bash
npx supabase gen types typescript --linked > src/shared/infrastructure/database/database.types.ts
```


