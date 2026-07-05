-- Migration to support Multi-Tenant Vendor Storefronts
-- Run this in your Supabase SQL editor

-- 1. Create stores table
create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  owner_id uuid references auth.users(id) on delete cascade,
  whatsapp_number text,
  whatsapp_template text,
  delivery_fee numeric(10,2) default 0,
  currency text default 'GHS',
  announcement_text text,
  announcement_active boolean default false,
  announcement_link text,
  tagline text default 'Discover Amazing Products',
  hero_images text[] not null default '{}',
  hero_rotation_seconds int not null default 6,
  social_instagram text,
  social_tiktok text,
  social_facebook text,
  show_visitor_count boolean default false,
  social_twitter text,
  minimum_order_amount numeric(10,2) default 0,
  maintenance_mode boolean not null default false,
  maintenance_message text,
  operating_hours text,
  payment_methods jsonb default '["momo", "cod"]',
  seo_meta_title text,
  seo_meta_description text,
  seo_og_image text,
  analytics_google_id text,
  analytics_pixel_id text,
  order_auto_cancel_hours int default 0,
  urgent_banner_active boolean not null default false,
  urgent_banner_text text,
  theme_color text default 'amber',
  markup_percentage numeric(5,2) default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Backfill: add new columns to existing stores
alter table if exists public.stores
  add column if not exists social_twitter text,
  add column if not exists minimum_order_amount numeric(10,2) default 0,
  add column if not exists maintenance_mode boolean not null default false,
  add column if not exists maintenance_message text,
  add column if not exists operating_hours text,
  add column if not exists payment_methods jsonb default '["momo", "cod"]',
  add column if not exists seo_meta_title text,
  add column if not exists seo_meta_description text,
  add column if not exists seo_og_image text,
  add column if not exists analytics_google_id text,
  add column if not exists analytics_pixel_id text,
  add column if not exists order_auto_cancel_hours int default 0,
  add column if not exists urgent_banner_active boolean not null default false,
  add column if not exists urgent_banner_text text,
  add column if not exists theme_color text default 'amber',
  add column if not exists markup_percentage numeric(5,2) default 0;

-- 2. Add columns to products table
alter table public.products
  add column if not exists store_id uuid references public.stores(id) on delete cascade,
  add column if not exists approval_status text default 'pending' check (approval_status in ('pending', 'approved', 'rejected')),
  add column if not exists is_approved_for_marketplace boolean default false,
  add column if not exists marketplace_price numeric(10,2);

-- 3. Add column to orders table
alter table public.orders
  add column if not exists store_id uuid references public.stores(id) on delete cascade;

-- 4. Indexes for performance
create index if not exists products_store_id_idx on public.products (store_id);
create index if not exists products_approval_status_idx on public.products (approval_status);
create index if not exists orders_store_id_idx on public.orders (store_id);

-- 5. Enable Row Level Security (RLS) on stores
alter table public.stores enable row level security;

-- 6. RLS Policies for stores
drop policy if exists "Public read stores" on public.stores;
create policy "Public read stores" on public.stores
  for select using (true);

drop policy if exists "Users insert own store" on public.stores;
create policy "Users insert own store" on public.stores
  for insert with check (auth.uid() = owner_id);

drop policy if exists "Owners manage own store" on public.stores;
create policy "Owners manage own store" on public.stores
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists "Admin manage all stores" on public.stores;
create policy "Admin manage all stores" on public.stores
  for all using (public.is_admin()) with check (public.is_admin());

-- 7. Update products RLS policies for merchants
drop policy if exists "Merchant view own products" on public.products;
create policy "Merchant view own products" on public.products
  for select to authenticated
  using (
    store_id in (select id from public.stores where owner_id = auth.uid())
  );

drop policy if exists "Merchant manage own products" on public.products;
create policy "Merchant manage own products" on public.products
  for all to authenticated
  using (
    store_id in (select id from public.stores where owner_id = auth.uid())
  )
  with check (
    store_id in (select id from public.stores where owner_id = auth.uid())
  );

-- 8. Update orders RLS policies for merchants
drop policy if exists "Merchant manage own orders" on public.orders;
create policy "Merchant manage own orders" on public.orders
  for all to authenticated
  using (
    store_id in (select id from public.stores where owner_id = auth.uid())
  )
  with check (
    store_id in (select id from public.stores where owner_id = auth.uid())
  );

-- 9. Update storage policies for image uploads
drop policy if exists "Merchant upload product images" on storage.objects;
create policy "Merchant upload product images" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'product-images' 
    and (
      public.is_admin() 
      or exists (select 1 from public.stores where owner_id = auth.uid())
    )
  );

-- 10. Enable Supabase Realtime for stores
alter publication supabase_realtime add table public.stores;
alter table public.stores replica identity full;

-- 11. Create site_reviews table
create table if not exists public.site_reviews (
  id uuid primary key default gen_random_uuid(),
  rating text not null check (rating in ('poor', 'okay', 'good', 'amazing')),
  comment text,
  email text,
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.site_reviews enable row level security;
