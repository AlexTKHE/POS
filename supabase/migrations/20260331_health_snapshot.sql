create extension if not exists pgcrypto;

create table if not exists public.health_daily_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null,
  sleep_hours numeric(4,2) not null,
  morning_weight_lb numeric(6,2) not null,
  steps_yesterday integer not null check (steps_yesterday >= 0),
  soreness smallint not null check (soreness between 1 and 10),
  energy smallint not null check (energy between 1 and 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, log_date)
);

create table if not exists public.health_hydration_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  bottle_size_oz numeric(6,2) not null default 24,
  height_inches numeric(5,2),
  weight_pounds numeric(6,2),
  manual_goal_oz numeric(6,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.health_hydration_days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  hydration_date date not null,
  bottle_count integer not null default 0 check (bottle_count >= 0),
  bottle_size_oz numeric(6,2) not null,
  total_oz numeric(6,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, hydration_date)
);

alter table public.health_daily_logs enable row level security;
alter table public.health_hydration_settings enable row level security;
alter table public.health_hydration_days enable row level security;

create policy "health_daily_logs_select_own"
on public.health_daily_logs
for select
using (auth.uid() = user_id);

create policy "health_daily_logs_insert_own"
on public.health_daily_logs
for insert
with check (auth.uid() = user_id);

create policy "health_daily_logs_update_own"
on public.health_daily_logs
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "health_daily_logs_delete_own"
on public.health_daily_logs
for delete
using (auth.uid() = user_id);

create policy "health_hydration_settings_select_own"
on public.health_hydration_settings
for select
using (auth.uid() = user_id);

create policy "health_hydration_settings_insert_own"
on public.health_hydration_settings
for insert
with check (auth.uid() = user_id);

create policy "health_hydration_settings_update_own"
on public.health_hydration_settings
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "health_hydration_settings_delete_own"
on public.health_hydration_settings
for delete
using (auth.uid() = user_id);

create policy "health_hydration_days_select_own"
on public.health_hydration_days
for select
using (auth.uid() = user_id);

create policy "health_hydration_days_insert_own"
on public.health_hydration_days
for insert
with check (auth.uid() = user_id);

create policy "health_hydration_days_update_own"
on public.health_hydration_days
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "health_hydration_days_delete_own"
on public.health_hydration_days
for delete
using (auth.uid() = user_id);
