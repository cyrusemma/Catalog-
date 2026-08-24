-- Migration: Create Price Ranges Table for Admin-Configurable Filters
-- Safe to run in Supabase SQL Editor

create table if not exists public.price_ranges (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  min_price numeric(10,2) not null default 0 check (min_price >= 0),
  max_price numeric(10,2) check (max_price is null or max_price >= min_price),
  label text not null,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Index for ordering and fast active retrieval
create index if not exists price_ranges_active_sort_idx on public.price_ranges (is_active, sort_order asc);

-- Enable Row-Level Security (RLS)
alter table public.price_ranges enable row level security;

-- Drop existing policies if any
drop policy if exists "Anyone can read active price ranges" on public.price_ranges;
drop policy if exists "Admins can manage price ranges" on public.price_ranges;

-- Policy: Anyone can view active price ranges
create policy "Anyone can read active price ranges"
  on public.price_ranges for select
  using (is_active = true or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Policy: Platform admins can insert, update, and delete price ranges
create policy "Admins can manage price ranges"
  on public.price_ranges for all
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Seed initial standard default ranges
insert into public.price_ranges (name, min_price, max_price, label, sort_order, is_active)
values
  ('Budget', 0, 50, 'Under GH₵50', 1, true),
  ('Mid Range', 50, 100, 'GH₵50 – GH₵100', 2, true),
  ('Standard', 100, 250, 'GH₵100 – GH₵250', 3, true),
  ('Upper', 250, 500, 'GH₵250 – GH₵500', 4, true),
  ('Premium', 500, null, 'GH₵500+', 5, true)
on conflict do nothing;
