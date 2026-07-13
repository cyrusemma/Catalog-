-- Migration: Create Discounts Table for Merchant Promo Codes and Auto-Discounts

create table if not exists public.discounts (
  id uuid default gen_random_uuid() primary key,
  store_id uuid references public.stores(id) on delete cascade not null,
  code text, -- nullable: if null, it is an auto-applied discount
  type text not null check (type in ('storewide', 'category', 'product')),
  target_id text, -- product ID for 'product', category name for 'category', null for 'storewide'
  discount_type text not null check (discount_type in ('percentage', 'fixed')),
  value numeric(10,2) not null check (value > 0),
  min_order_amount numeric(10,2) not null default 0 check (min_order_amount >= 0),
  active boolean not null default true,
  created_at timestamp with time zone default now()
);

-- Unique constraint index to prevent duplicate codes for the same store (case-insensitive)
create unique index if not exists discounts_store_code_idx on public.discounts (store_id, lower(code)) where code is not null;

-- Enable Row-Level Security (RLS)
alter table public.discounts enable row level security;

-- Drop existing policies if they exist to prevent duplication conflicts
drop policy if exists "Anyone can view discounts" on public.discounts;
drop policy if exists "Merchants can manage their own discounts" on public.discounts;

-- Policy: Customers need to query discounts to calculate totals during checkout
create policy "Anyone can view discounts"
  on public.discounts for select
  using (true);

-- Policy: Store owner has full insert/update/delete permissions for their own store's discounts
create policy "Merchants can manage their own discounts"
  on public.discounts for all
  using (
    exists (
      select 1 from public.stores s
      where s.id = discounts.store_id
        and s.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.stores s
      where s.id = discounts.store_id
        and s.owner_id = auth.uid()
    )
  );
