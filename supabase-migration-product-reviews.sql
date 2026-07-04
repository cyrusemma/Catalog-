-- ============================================================
-- Product Reviews Migration
-- Run this in your Supabase SQL editor.
-- ============================================================

-- 1. Create product_reviews table (matches the agreed data model)
create table if not exists public.product_reviews (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid not null references public.products(id) on delete cascade,
  store_id     uuid references public.stores(id) on delete cascade,   -- for merchant-scoped moderation queries
  customer_id  uuid references auth.users(id) on delete set null,
  reviewer_name  text,
  reviewer_email text,
  rating       int not null check (rating between 1 and 5),
  comment      text,
  status       text not null default 'pending'
               check (status in ('pending', 'published', 'hidden')),
  created_at   timestamptz not null default now()
);

-- 2. Indexes
create index if not exists product_reviews_product_id_idx on public.product_reviews (product_id);
create index if not exists product_reviews_store_id_idx   on public.product_reviews (store_id);
create index if not exists product_reviews_status_idx     on public.product_reviews (status);

-- 3. Enable RLS
alter table public.product_reviews enable row level security;

-- 4. Policies

-- Anyone can read published reviews
drop policy if exists "Public read published product reviews" on public.product_reviews;
create policy "Public read published product reviews"
  on public.product_reviews for select
  using (status = 'published');

-- Authenticated users can submit reviews (one per product per user is enforced at app level)
drop policy if exists "Authenticated users submit reviews" on public.product_reviews;
create policy "Authenticated users submit reviews"
  on public.product_reviews for insert to authenticated
  with check (auth.uid() = customer_id);

-- Merchants can read & moderate (update status) reviews for their own store's products
drop policy if exists "Merchants moderate own store reviews" on public.product_reviews;
create policy "Merchants moderate own store reviews"
  on public.product_reviews for all to authenticated
  using  (store_id in (select id from public.stores where owner_id = auth.uid()))
  with check (store_id in (select id from public.stores where owner_id = auth.uid()));

-- Platform admin can manage all reviews
drop policy if exists "Admin manage all product reviews" on public.product_reviews;
create policy "Admin manage all product reviews"
  on public.product_reviews for all
  using  (public.is_admin())
  with check (public.is_admin());

-- 5. Helper view: avg rating per product (used by ProductCard + ProductDetail)
create or replace view public.product_review_stats as
select
  product_id,
  count(*)::int                          as review_count,
  round(avg(rating)::numeric, 1)::float  as avg_rating
from public.product_reviews
where status = 'published'
group by product_id;

-- Grant read access on the view
grant select on public.product_review_stats to anon, authenticated;
