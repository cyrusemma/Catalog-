-- Migration to support backend-synced wishlist
-- Run this in your Supabase SQL editor

alter table public.profiles
  add column if not exists wishlist jsonb not null default '[]'::jsonb;
