-- Migration to support Hybrid Account Deletion with Admin Approval
-- Paste this script into your Supabase SQL editor.

-- 1. Add deletion_requested_at to profiles
alter table public.profiles
  add column if not exists deletion_requested_at timestamptz;

-- 2. Trigger to put store into maintenance mode if owner requests deletion
create or replace function public.handle_profile_deletion_requested()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.deletion_requested_at is not null and (old.deletion_requested_at is null or old.deletion_requested_at <> new.deletion_requested_at) then
    -- Put their store in maintenance mode
    update public.stores
    set maintenance_mode = true,
        maintenance_message = 'This store is temporarily closed because the owner requested account deletion.'
    where owner_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_profile_deletion_requested on public.profiles;
create trigger on_profile_deletion_requested
  before update on public.profiles
  for each row
  execute function public.handle_profile_deletion_requested();

-- 3. RPC to hard delete a user from auth.users (Cascades to profile, store, products, etc.)
create or replace function public.delete_user_by_admin(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  -- Check if caller is platform admin
  if not public.is_admin() then
    raise exception 'Access Denied: Only administrators can delete users permanently.';
  end if;

  -- Delete from auth.users (cascades automatically to public.profiles, stores, products, etc.)
  delete from auth.users where id = target_user_id;
end;
$$;

-- 4. RPC to restore/cancel deletion request by admin
create or replace function public.restore_user_by_admin(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Check if caller is platform admin
  if not public.is_admin() then
    raise exception 'Access Denied: Only administrators can restore users.';
  end if;

  -- Clear deletion request
  update public.profiles
  set deletion_requested_at = null
  where id = target_user_id;
end;
$$;
