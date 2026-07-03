-- Web Push subscriptions. One row per (user, browser/device endpoint). Each
-- subscription carries the endpoint URL plus the p256dh + auth keys the push
-- service needs to verify our messages.
-- Safe to run multiple times in the Supabase SQL Editor.

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

create index if not exists push_subscriptions_user_idx on push_subscriptions (user_id);

alter table push_subscriptions enable row level security;

drop policy if exists "Users manage own push subscriptions" on push_subscriptions;
create policy "Users manage own push subscriptions" on push_subscriptions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Admin read all push subscriptions" on push_subscriptions;
create policy "Admin read all push subscriptions" on push_subscriptions
  for select
  using ((((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text));

-- Edge Function uses the service_role key (RLS bypassed), so it can read every
-- subscription for fan-out.

