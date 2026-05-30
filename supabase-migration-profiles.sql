-- Customer profiles table + auto-create trigger. Foundation for customer
-- accounts, server-synced favorites (later), and the notify_new_arrivals flag
-- that gates push notifications.
-- Safe to run multiple times in the Supabase SQL Editor.

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  notify_new_arrivals boolean not null default false,
  created_at timestamptz default now()
);

create index if not exists profiles_notify_idx
  on profiles (notify_new_arrivals)
  where notify_new_arrivals = true;

-- Auto-create the profile row when a new auth user signs in for the first
-- time. SECURITY DEFINER lets the trigger insert despite RLS being enabled.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table profiles enable row level security;

drop policy if exists "Users read own profile" on profiles;
drop policy if exists "Users update own profile" on profiles;
drop policy if exists "Admin reads all profiles" on profiles;

create policy "Users read own profile" on profiles
  for select using (auth.uid() = id);

create policy "Users update own profile" on profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "Admin reads all profiles" on profiles
  for select
  using ((((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text));
