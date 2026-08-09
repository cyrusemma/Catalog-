-- Migration to support extended profile fields (Address Book, Store Credit, and Followed Stores)
-- Run this in your Supabase SQL editor to create the new columns.

alter table public.profiles
  add column if not exists phone text,
  add column if not exists address text,
  add column if not exists store_credit numeric(10,2) not null default 0.00,
  add column if not exists followed_stores jsonb not null default '[]'::jsonb;
