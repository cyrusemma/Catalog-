-- Migration for Store Approvals

-- 1. Add new columns to stores table
alter table public.stores
  add column if not exists approval_status text default 'pending' check (approval_status in ('pending', 'approved', 'rejected')),
  add column if not exists business_category text,
  add column if not exists description text,
  add column if not exists instagram_handle text;

-- 2. Index on approval status
create index if not exists stores_approval_status_idx on public.stores (approval_status);

-- Note: The admin manages all stores via "Admin manage all stores" RLS policy,
-- so no new policies are required to update the approval status.
