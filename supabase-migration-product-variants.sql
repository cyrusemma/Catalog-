-- Migration: Add variants column to products table for priced variations with custom photos and specs
-- Safe to run multiple times in Supabase SQL Editor

alter table public.products
  add column if not exists variants jsonb not null default '[]'::jsonb;

-- Optional GIN index for querying variant attributes or pricing inside JSONB
create index if not exists products_variants_gin_idx on public.products using gin (variants);
