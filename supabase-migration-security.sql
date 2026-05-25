-- Run this in Supabase SQL Editor if you already applied an older supabase-schema.sql
-- Safe to run multiple times (drops old policies before recreating)

-- Admin role helper (JWT app_metadata.role or user_metadata.role = 'admin')
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    auth.jwt() -> 'app_metadata' ->> 'role',
    auth.jwt() -> 'user_metadata' ->> 'role'
  ) = 'admin';
$$;

-- Unique slugs
create unique index if not exists products_slug_unique on products (slug) where slug is not null;

-- Products policies
drop policy if exists "Admin all products" on products;
drop policy if exists "Admin manage products" on products;

create policy "Admin manage products" on products
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- Orders: admin only (storefront uses WhatsApp, not DB inserts)
drop policy if exists "Public insert orders" on orders;
drop policy if exists "Admin all orders" on orders;

create policy "Admin manage orders" on orders
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- Store settings
drop policy if exists "Admin all settings" on store_settings;
drop policy if exists "Admin manage settings" on store_settings;

create policy "Admin manage settings" on store_settings
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- Reviews table
create table if not exists site_reviews (
  id uuid primary key default gen_random_uuid(),
  name text,
  rating int not null check (rating between 1 and 5),
  message text not null,
  page_url text,
  created_at timestamptz default now()
);

alter table site_reviews enable row level security;

drop policy if exists "Public submit reviews" on site_reviews;
drop policy if exists "Admin manage reviews" on site_reviews;

create policy "Public submit reviews" on site_reviews
  for insert with check (true);

create policy "Admin manage reviews" on site_reviews
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- Storage bucket for product images
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists "Public read product images" on storage.objects;
drop policy if exists "Admin upload product images" on storage.objects;
drop policy if exists "Admin update product images" on storage.objects;
drop policy if exists "Admin delete product images" on storage.objects;

create policy "Public read product images" on storage.objects
  for select using (bucket_id = 'product-images');

create policy "Admin upload product images" on storage.objects
  for insert with check (bucket_id = 'product-images' and public.is_admin());

create policy "Admin update product images" on storage.objects
  for update using (bucket_id = 'product-images' and public.is_admin());

create policy "Admin delete product images" on storage.objects
  for delete using (bucket_id = 'product-images' and public.is_admin());

-- Grant admin role to your user (replace email):
-- update auth.users
-- set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
-- where email = 'you@example.com';
