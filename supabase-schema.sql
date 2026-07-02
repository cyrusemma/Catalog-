-- Run this in your Supabase SQL editor (new projects)
-- This file mirrors the production database — keep it in sync.

-- =========================================================================
-- Tables
-- =========================================================================

-- Categories table (supports parent > sub-category threads)
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  parent_id uuid references categories(id) on delete cascade,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (parent_id, slug)
);

create index if not exists categories_parent_idx on categories (parent_id);

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
  stock_status text default 'few_units_left' check (stock_status in ('in_stock', 'few_units_left', 'out_of_stock')),
  category text,                       -- legacy text column, kept for back-compat reads
  category_id uuid references categories(id) on delete set null,
  brand text,
  specs jsonb,
  key_features text[] default '{}',
  sizes text[] not null default '{}',
  colors text[] not null default '{}',
  delivery_fee numeric(10,2) not null default 0,  -- 0 = free delivery
  rating numeric(3,1),
  rating_count int,
  is_featured boolean default false,
  is_published boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists products_slug_unique on products (slug) where slug is not null;
create index if not exists products_category_published_idx on products (category_id, is_published, created_at desc);
create index if not exists products_published_created_idx on products (is_published, created_at desc);

-- Orders table (guest checkout via WhatsApp — anyone can insert)
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  customer_phone text not null,
  customer_address text,
  items jsonb not null default '[]',
  subtotal numeric(10,2) not null default 0,
  delivery_fee numeric(10,2) not null default 0,
  discount_amount numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  currency text default 'GHS',
  -- Receipt / payment fields
  receipt_number text,
  payment_status text default 'pending' check (payment_status in ('pending','paid','refunded','failed')),
  payment_method text,
  payment_reference text,
  paid_at timestamptz,
  -- Status timestamps
  confirmed_at timestamptz,
  processing_at timestamptz,
  shipped_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz,
  status text default 'pending' check (status in ('pending','confirmed','processing','shipped','delivered','cancelled')),
  notes text,
  customer_id uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

-- Backfill/upgrade helpers for existing installations: add missing columns safely
alter table if exists orders
  add column if not exists subtotal numeric(10,2) not null default 0,
  add column if not exists delivery_fee numeric(10,2) not null default 0,
  add column if not exists discount_amount numeric(10,2) not null default 0,
  add column if not exists currency text default 'GHS',
  add column if not exists receipt_number text,
  add column if not exists payment_status text default 'pending',
  add column if not exists payment_method text,
  add column if not exists payment_reference text,
  add column if not exists paid_at timestamptz,
  add column if not exists confirmed_at timestamptz,
  add column if not exists processing_at timestamptz,
  add column if not exists shipped_at timestamptz,
  add column if not exists delivered_at timestamptz,
  add column if not exists cancelled_at timestamptz,
  add column if not exists customer_id uuid references auth.users(id) on delete set null;

create unique index if not exists orders_receipt_number_unique on orders (receipt_number) where receipt_number is not null;
create index if not exists orders_customer_id_idx on orders (customer_id);

-- Store settings — enforced singleton (only one row ever exists)
create table if not exists store_settings (
  id uuid primary key default gen_random_uuid(),
  store_name text default 'Catalog by Cyrus',
  tagline text default 'Discover Amazing Products Brought to you By Cyrus',
  whatsapp_number text,
  logo_url text,
  delivery_fee numeric(10,2) default 0,           -- legacy global fee, no longer used (per-product delivery_fee is canonical)
  currency text default 'GHS',
  hero_images text[] not null default '{}',       -- ordered list of hero image URLs (carousel)
  hero_rotation_seconds int not null default 6,
  announcement_text text,
  announcement_active boolean not null default false,
  announcement_link text,
  social_instagram text,
  social_tiktok text,
  social_facebook text,
  whatsapp_template text,                         -- optional custom order message; supports {items} {subtotal} {delivery} {total} {currency}
  updated_at timestamptz default now()
);

-- Singleton enforcement: prevents accidental duplicate-insert bugs.
-- ((true)) means there can only ever be one row where the expression "true" is true → at most 1 row total.
create unique index if not exists store_settings_singleton_idx on store_settings ((true));

-- Site reviews submitted by users (planned feature; admin dashboard already reads this)
create table if not exists site_reviews (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text,
  rating int not null check (rating between 1 and 5),
  message text not null,
  page_url text,
  created_at timestamptz default now()
);

-- =========================================================================
-- Admin role helper
-- =========================================================================

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  -- Only trust app_metadata.role. user_metadata is editable by the user via
  -- supabase.auth.updateUser, so including it would allow self-granted admin.
  select (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin';
$$;

-- =========================================================================
-- Row Level Security
-- =========================================================================

alter table products enable row level security;
alter table categories enable row level security;
alter table orders enable row level security;
alter table store_settings enable row level security;
alter table site_reviews enable row level security;

-- Public reads
create policy "Public read products" on products for select using (is_published = true);
create policy "Public read categories" on categories for select using (true);
create policy "Public read settings" on store_settings for select using (true);

-- Guest checkout: anyone can place an order (storefront uses WhatsApp redirect but also writes to orders table)
create policy "Public insert orders" on orders for insert with check (true);

create policy "Users read own orders" on orders for select using (customer_id = auth.uid());

-- Admin-only management
create policy "Admin manage products" on products
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Admin manage categories" on categories
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Admin manage orders" on orders
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Admin manage settings" on store_settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Reviews: public can submit, admins manage
create policy "Public submit reviews" on site_reviews for insert with check (true);
create policy "Admin manage reviews" on site_reviews
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- =========================================================================
-- Storage: product-images bucket (also used for hero/logo uploads)
-- =========================================================================

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- NOTE: we deliberately do NOT add a "Public read" SELECT policy on storage.objects
-- for this bucket. The bucket is public, so direct object URLs (storage.from('product-images').getPublicUrl(...))
-- work without any policy. Adding SELECT would also grant list() access to anyone,
-- which would let strangers enumerate every uploaded file. Avoid that.

create policy "Admin upload product images" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'product-images' and public.is_admin());

create policy "Admin update product images" on storage.objects
  for update to authenticated
  using (bucket_id = 'product-images' and public.is_admin());

create policy "Admin delete product images" on storage.objects
  for delete to authenticated
  using (bucket_id = 'product-images' and public.is_admin());

-- =========================================================================
-- Realtime — broadcasts row changes to subscribed clients
-- =========================================================================

-- Both tables are watched by the storefront so admin saves propagate
-- instantly (no page refresh needed).
alter publication supabase_realtime add table public.store_settings;
alter publication supabase_realtime add table public.categories;
alter publication supabase_realtime add table public.products;

-- replica identity full sends the entire row on update, not just changed columns —
-- makes change events more useful downstream.
alter table public.store_settings replica identity full;
alter table public.categories replica identity full;

-- =========================================================================
-- Seed categories (delete if you want to start from scratch)
-- =========================================================================

with parents as (
  insert into public.categories (name, slug, sort_order)
  values
    ('Fashion', 'fashion', 1),
    ('Electronics', 'electronics', 2),
    ('Beauty', 'beauty', 3),
    ('Lifestyle', 'lifestyle', 4),
    ('Other', 'other', 99)
  on conflict do nothing
  returning id, slug
)
insert into public.categories (name, slug, parent_id, sort_order)
select s.name, s.slug, p.id, s.sort_order
from (values
  ('Shirts',           'shirts',           'fashion',     1),
  ('Shoes',            'shoes',            'fashion',     2),
  ('Bags',             'bags',             'fashion',     3),
  ('Jewelries',        'jewelries',        'fashion',     4),
  ('Watches',          'watches',          'fashion',     5),
  ('Accessories',      'accessories',      'fashion',     6),
  ('Phones & Tablets', 'phones-tablets',   'electronics', 1),
  ('Computing',        'computing',        'electronics', 2),
  ('Audio',            'audio',            'electronics', 3),
  ('Gaming',           'gaming',           'electronics', 4),
  ('Makeup',           'makeup',           'beauty',      1),
  ('Skincare',         'skincare',         'beauty',      2),
  ('Fragrances',       'fragrances',       'beauty',      3),
  ('Home & Office',    'home-office',      'lifestyle',   1),
  ('Sporting Goods',   'sporting-goods',   'lifestyle',   2)
) as s(name, slug, parent_slug, sort_order)
join parents p on p.slug = s.parent_slug
on conflict do nothing;

-- =========================================================================
-- Post-install: grant your admin user the admin role (replace email)
-- =========================================================================

-- update auth.users
-- set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
-- where email = 'you@example.com';
