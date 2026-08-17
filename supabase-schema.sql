-- BAROKAH TELUR V70
-- Supabase/PostgreSQL schema for durable online storage.
-- Run this in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'owner' check (role in ('owner','admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('income','expense')),
  note text not null,
  price numeric(18,3) not null default 0 check (price >= 0),
  unit text not null,
  qty numeric(18,6) not null check (qty > 0),
  total numeric(18,3) not null default 0 check (total >= 0),
  transaction_date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product text not null default 'Telur Ayam Ras',
  movement_type text not null check (movement_type in ('Masuk','Keluar','Retak','Tidak Layak')),
  qty numeric(18,6) not null check (qty > 0),
  unit text not null,
  delta_butir numeric(18,6) not null,
  saldo_after_butir numeric(18,6) not null check (saldo_after_butir >= 0),
  note text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists transactions_user_date_idx on public.transactions(user_id, transaction_date desc, created_at desc);
create index if not exists stock_movements_user_created_idx on public.stock_movements(user_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.transactions enable row level security;
alter table public.stock_movements enable row level security;

-- Profiles: a user can only read/update their own profile.
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles for select using (auth.uid() = id);
drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles for insert with check (auth.uid() = id);
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- Transactions: strictly per logged-in account.
drop policy if exists transactions_select_own on public.transactions;
create policy transactions_select_own on public.transactions for select using (auth.uid() = user_id);
drop policy if exists transactions_insert_own on public.transactions;
create policy transactions_insert_own on public.transactions for insert with check (auth.uid() = user_id);
drop policy if exists transactions_update_own on public.transactions;
create policy transactions_update_own on public.transactions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists transactions_delete_own on public.transactions;
create policy transactions_delete_own on public.transactions for delete using (auth.uid() = user_id);

-- Stock history: strictly per logged-in account.
drop policy if exists stock_select_own on public.stock_movements;
create policy stock_select_own on public.stock_movements for select using (auth.uid() = user_id);
drop policy if exists stock_insert_own on public.stock_movements;
create policy stock_insert_own on public.stock_movements for insert with check (auth.uid() = user_id);
drop policy if exists stock_delete_own on public.stock_movements;
create policy stock_delete_own on public.stock_movements for delete using (auth.uid() = user_id);

-- Auto-create profile after Supabase Auth signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Keep updated_at current.
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles for each row execute procedure public.set_updated_at();
drop trigger if exists transactions_set_updated_at on public.transactions;
create trigger transactions_set_updated_at before update on public.transactions for each row execute procedure public.set_updated_at();


-- Running-balance view: saldo is recalculated from movement deltas, so deleting/resetting
-- history cannot leave a stale warehouse balance.
drop view if exists public.stock_movement_history;
create view public.stock_movement_history
with (security_invoker = true)
as
select
  sm.*,
  sum(sm.delta_butir) over (
    partition by sm.user_id, sm.product
    order by sm.created_at, sm.id
    rows between unbounded preceding and current row
  ) as calculated_saldo_after_butir
from public.stock_movements sm;
