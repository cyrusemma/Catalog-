-- Adds Preorder flagging and per-product Flash Sale (price + countdown) support.
-- Safe to run multiple times in the Supabase SQL Editor.

-- Preorder: when true, the storefront shows a "Preorder" badge.
alter table products add column if not exists is_preorder boolean not null default false;

-- Flash sale: a product is "on sale" when BOTH columns are set, the price is
-- below the normal selling_price, and the end time is still in the future.
-- The storefront reverts to the normal price automatically once it expires.
alter table products add column if not exists flash_sale_price numeric(10,2);
alter table products add column if not exists flash_sale_ends_at timestamptz;

-- Lets the storefront cheaply find live flash sales (ends_at in the future).
create index if not exists products_flash_sale_idx
  on products (flash_sale_ends_at)
  where flash_sale_ends_at is not null;
