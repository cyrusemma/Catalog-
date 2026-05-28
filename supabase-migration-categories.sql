-- Adds category/sub-category support to an existing Catalog database.
-- Safe to run multiple times in the Supabase SQL Editor.

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  parent_id uuid references categories(id) on delete cascade,
  sort_order int not null default 99,
  created_at timestamptz default now()
);

create unique index if not exists categories_parent_slug_unique
  on categories (coalesce(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), slug);

create index if not exists categories_parent_sort_idx on categories (parent_id, sort_order, name);

alter table products add column if not exists category_id uuid references categories(id) on delete set null;
alter table products add column if not exists sizes text[] default '{}';
alter table products add column if not exists delivery_fee numeric(10,2) default 0;

do $$
begin
  if exists (
    select 1
    from information_schema.check_constraints
    where constraint_name = 'products_stock_status_check'
  ) then
    alter table products drop constraint products_stock_status_check;
  end if;
end $$;

alter table products
  add constraint products_stock_status_check
  check (stock_status in ('in_stock', 'few_units_left', 'out_of_stock'));

create index if not exists products_category_published_idx on products (category_id, is_published, created_at desc);
create index if not exists products_published_created_idx on products (is_published, created_at desc);

alter table categories enable row level security;

drop policy if exists "Public read categories" on categories;
drop policy if exists "Admin manage categories" on categories;

create policy "Public read categories" on categories
  for select using (true);

create policy "Admin manage categories" on categories
  for all
  using (public.is_admin())
  with check (public.is_admin());
