-- Platform spin wheel rewards.
-- The selection happens in Postgres so the browser cannot choose a larger reward.

create table if not exists public.spin_wheel_config (
  id boolean primary key default true check (id),
  active boolean not null default true,
  cooldown_hours integer not null default 24 check (cooldown_hours >= 0),
  updated_at timestamptz not null default now()
);

insert into public.spin_wheel_config (id)
values (true)
on conflict (id) do nothing;

create table if not exists public.spin_wheel_rewards (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  reward_type text not null check (reward_type in ('credit', 'free_shipping')),
  credit_amount numeric(10,2) not null default 0 check (credit_amount >= 0),
  min_order_amount numeric(10,2) not null default 0 check (min_order_amount >= 0),
  weight integer not null check (weight > 0),
  active boolean not null default true,
  expires_in_days integer not null default 7 check (expires_in_days > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.spin_wheel_spins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reward_id uuid not null references public.spin_wheel_rewards(id),
  reward_label text not null,
  reward_type text not null check (reward_type in ('credit', 'free_shipping')),
  credit_amount numeric(10,2) not null default 0 check (credit_amount >= 0),
  min_order_amount numeric(10,2) not null default 0 check (min_order_amount >= 0),
  status text not null default 'available' check (status in ('available', 'redeemed', 'expired')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists spin_wheel_spins_user_status_idx
  on public.spin_wheel_spins (user_id, status, expires_at);

alter table public.spin_wheel_config enable row level security;
alter table public.spin_wheel_rewards enable row level security;
alter table public.spin_wheel_spins enable row level security;

drop policy if exists "Anyone can view active wheel config" on public.spin_wheel_config;
create policy "Anyone can view active wheel config"
  on public.spin_wheel_config for select using (active = true);

drop policy if exists "Platform admins can view wheel config" on public.spin_wheel_config;
create policy "Platform admins can view wheel config"
  on public.spin_wheel_config for select
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Anyone can view active wheel rewards" on public.spin_wheel_rewards;
create policy "Anyone can view active wheel rewards"
  on public.spin_wheel_rewards for select using (active = true);

drop policy if exists "Platform admins can view wheel rewards" on public.spin_wheel_rewards;
create policy "Platform admins can view wheel rewards"
  on public.spin_wheel_rewards for select
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Users can view their own wheel spins" on public.spin_wheel_spins;
create policy "Users can view their own wheel spins"
  on public.spin_wheel_spins for select using (auth.uid() = user_id);

drop policy if exists "Platform admins can manage wheel config" on public.spin_wheel_config;
create policy "Platform admins can manage wheel config"
  on public.spin_wheel_config for all
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Platform admins can manage wheel rewards" on public.spin_wheel_rewards;
create policy "Platform admins can manage wheel rewards"
  on public.spin_wheel_rewards for all
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create or replace function public.spin_the_wheel()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  config_row public.spin_wheel_config%rowtype;
  selected public.spin_wheel_rewards%rowtype;
  total_weight integer;
  cursor_weight integer := 0;
  target_weight integer;
  last_spin timestamptz;
begin
  if caller is null then
    raise exception 'Authentication required';
  end if;

  select * into config_row from public.spin_wheel_config where id = true;
  if not found or not config_row.active then
    raise exception 'Spin wheel is not active';
  end if;

  select max(created_at) into last_spin
  from public.spin_wheel_spins
  where user_id = caller;

  if last_spin is not null
     and last_spin > now() - make_interval(hours => config_row.cooldown_hours) then
    raise exception 'You can spin again later';
  end if;

  select coalesce(sum(weight), 0) into total_weight
  from public.spin_wheel_rewards
  where active = true;
  if total_weight = 0 then
    raise exception 'No wheel rewards are configured';
  end if;

  target_weight := floor(random() * total_weight)::integer + 1;
  for selected in
    select * from public.spin_wheel_rewards where active = true order by id
  loop
    cursor_weight := cursor_weight + selected.weight;
    exit when cursor_weight >= target_weight;
  end loop;

  insert into public.spin_wheel_spins (
    user_id, reward_id, reward_label, reward_type, credit_amount,
    min_order_amount, expires_at
  )
  values (
    caller, selected.id, selected.label, selected.reward_type, selected.credit_amount,
    selected.min_order_amount, now() + make_interval(days => selected.expires_in_days)
  );

  return json_build_object(
    'label', selected.label,
    'reward_type', selected.reward_type,
    'credit_amount', selected.credit_amount,
    'min_order_amount', selected.min_order_amount,
    'expires_in_days', selected.expires_in_days
  );
end;
$$;

revoke all on function public.spin_the_wheel() from public;
grant execute on function public.spin_the_wheel() to authenticated;

create or replace function public.redeem_spin_reward(reward_spin_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.spin_wheel_spins
  set status = 'redeemed'
  where id = reward_spin_id
    and user_id = auth.uid()
    and status = 'available'
    and expires_at > now();
  return found;
end;
$$;

revoke all on function public.redeem_spin_reward(uuid) from public;
grant execute on function public.redeem_spin_reward(uuid) to authenticated;

insert into public.spin_wheel_rewards
  (label, reward_type, credit_amount, min_order_amount, weight)
select 'GHS 5 store credit', 'credit', 5, 50, 45
where not exists (select 1 from public.spin_wheel_rewards);

insert into public.spin_wheel_rewards
  (label, reward_type, credit_amount, min_order_amount, weight)
select 'GHS 10 store credit', 'credit', 10, 100, 25
where (select count(*) from public.spin_wheel_rewards) = 1;

insert into public.spin_wheel_rewards
  (label, reward_type, credit_amount, min_order_amount, weight)
select 'Free standard shipping', 'free_shipping', 0, 50, 30
where (select count(*) from public.spin_wheel_rewards) = 2;
