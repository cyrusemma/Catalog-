-- Run this in your Supabase SQL editor (new projects)

-- Products table
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text,
  description text,
  images text[] default '{}',
  source_url text,
  source_price numeric(10,2),
  selling_price numeric(10,2) not null default 0,
  original_price numeric(10,2),
  discount_percent int,
  stock int default 1,
  stock_status text default 'in_stock' check (stock_status in ('in_stock', 'out_of_stock')),
  category text,
  brand text,
  specs jsonb,
  key_features text[] default '{}',
  rating numeric(3,1),
  rating_count int,
  is_featured boolean default false,
  is_published boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Orders table
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  customer_phone text not null,
  customer_address text,
  items jsonb not null default '[]',
  total numeric(10,2) not null default 0,
  status text default 'pending' check (status in ('pending','confirmed','processing','shipped','delivered','cancelled')),
  notes text,
  created_at timestamptz default now()
);

-- Store settings
create table if not exists store_settings (
  id uuid primary key default gen_random_uuid(),
  store_name text default 'Catalog by Cyrus',
  tagline text default 'Discover Amazing Products Brought to you By Cyrus',
  whatsapp_number text,
  logo_url text,
  delivery_fee numeric(10,2) default 0,
  currency text default 'GHS',
  updated_at timestamptz default now()
);

create unique index if not exists products_slug_unique on products (slug) where slug is not null;

-- Admin role helper
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin';
$$;

-- Row Level Security
alter table products enable row level security;
alter table orders enable row level security;
alter table store_settings enable row level security;

-- Public can read published products
create policy "Public read products" on products for select using (is_published = true);

-- Public can read store settings
create policy "Public read settings" on store_settings for select using (true);

-- Only admins can manage data
create policy "Admin manage products" on products
  for all using (public.is_admin()) with check (public.is_admin());

create policy "Admin manage orders" on orders
  for all using (public.is_admin()) with check (public.is_admin());

create policy "Admin manage settings" on store_settings
  for all using (public.is_admin()) with check (public.is_admin());

-- Storage bucket for product images
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

create policy "Public read product images" on storage.objects
  for select using (bucket_id = 'product-images');

create policy "Admin upload product images" on storage.objects
  for insert with check (bucket_id = 'product-images' and public.is_admin());

create policy "Admin update product images" on storage.objects
  for update using (bucket_id = 'product-images' and public.is_admin());

create policy "Admin delete product images" on storage.objects
  for delete using (bucket_id = 'product-images' and public.is_admin());

-- After creating your admin user, grant the admin role (replace email):
-- update auth.users
-- set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
-- where email = 'you@example.com';
