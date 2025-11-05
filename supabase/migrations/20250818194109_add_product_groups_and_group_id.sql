begin;

create table if not exists public.product_groups (
  id smallint primary key,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

insert into public.product_groups (id, name) values
  (1, 'FRAM'),
  (2, 'SANTOS, PENEDO'),
  (3, 'FRETE'),
  (4, 'FRESH AROMATIZANTE'),
  (5, 'PRESTONE'),
  (10, 'PARAFLU'),
  (15, 'BRINDES'),
  (23, 'EXCLUIDOS'),
  (25, 'GT - OIL'),
  (27, 'TEXACO'),
  (28, 'BOSCH FILTROS'),
  (30, 'DONALDSON'),
  (31, 'VITORIA REGINA'),
  (32, 'DIVERSOS'),
  (33, 'MAXON OIL'),
  (35, 'PETROBRAS'),
  (36, 'WEGA'),
  (39, 'HENGST'),
  (40, 'RACOR'),
  (42, 'UNIFILTER'),
  (44, 'TECBRIL IND. QUIMICA'),
  (45, 'SEM GIRO DIVERSOS'),
  (46, 'TECBRIL UNIT.'),
  (47, 'VALVOLINE'),
  (48, 'BOSCH'),
  (49, 'VCLEAN PALHETAS'),
  (50, 'SEM GIRO TECFBRIL'),
  (51, 'SEM GIRO VALVOLINE'),
  (52, 'IPS'),
  (53, 'MAHLE'),
  (54, 'FLEXOIL'),
  (55, 'MICRONAIR'),
  (56, 'MAHLE ABM'),
  (57, 'RMIX'),
  (58, 'TECFIL'),
  (60, 'MANN'),
  (65, 'AUTOIMPACT')
on conflict (id) do update set name = excluded.name;

alter table public.products
  add column if not exists group_id smallint;

do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_namespace n on n.oid = c.connamespace
    where c.conname = 'products_group_id_fkey'
      and n.nspname = 'public'
  ) then
    alter table public.products
      add constraint products_group_id_fkey
      foreign key (group_id) references public.product_groups(id)
      on update cascade on delete set null;
  end if;
end $$;

create index if not exists idx_products_group_id on public.products(group_id);

comment on column public.products.group_id is 'Product group code (FK to product_groups)';

commit;

