begin;

insert into public.product_groups (id, name)
values (99, 'FRETEs')
on conflict (id) do update set name = excluded.name;

commit;

