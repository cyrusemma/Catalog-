-- Adds anonymous visit tracking and the storefront visitor-count toggle.
-- Safe to run multiple times in the Supabase SQL Editor.

-- One row per session. The storefront counter and the admin dashboard both
-- read from this. session_id is a client-side uuid kept in sessionStorage so
-- reloads inside a tab don't double-count.
create table if not exists visits (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  created_at timestamptz not null default now()
);
create index if not exists visits_session_idx on visits (session_id);
create index if not exists visits_created_idx on visits (created_at desc);

alter table visits enable row level security;

drop policy if exists "Anyone can log a visit" on visits;
drop policy if exists "Admin reads visits" on visits;

create policy "Anyone can log a visit" on visits
  for insert with check (true);

create policy "Admin reads visits" on visits
  for select
  using ((((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text));

-- SECURITY DEFINER so the public storefront can show a total without granting
-- raw read access. Returns the all-time count.
create or replace function public.get_visitor_count()
returns bigint
language sql
security definer
set search_path = public
as $$
  select count(*)::bigint from public.visits;
$$;

grant execute on function public.get_visitor_count() to anon, authenticated;

-- Admin-controlled toggle for the floating storefront chip.
alter table store_settings add column if not exists show_visitor_count boolean not null default false;
