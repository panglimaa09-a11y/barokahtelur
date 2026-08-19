-- BAROKAH TELUR V70.3.7
-- Modul Utang Piutang terpisah dari Riwayat Transaksi.
-- Jalankan sekali di Supabase SQL Editor.

create table if not exists public.debts_receivables (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('piutang','utang')),
  party_type text not null check (party_type in ('pelanggan','supplier')),
  party_name text not null,
  phone text,
  reference_no text,
  debt_date date not null default current_date,
  due_date date,
  total_amount numeric(14,2) not null check (total_amount > 0),
  paid_amount numeric(14,2) not null default 0 check (paid_amount >= 0),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint debt_paid_not_over_total check (paid_amount <= total_amount)
);

create table if not exists public.debt_payments (
  id uuid primary key default gen_random_uuid(),
  debt_id uuid not null references public.debts_receivables(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  payment_date date not null default current_date,
  amount numeric(14,2) not null check (amount > 0),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists debts_receivables_user_kind_date_idx
  on public.debts_receivables(user_id, kind, debt_date desc, created_at desc);
create index if not exists debt_payments_user_date_idx
  on public.debt_payments(user_id, payment_date desc, created_at desc);
create index if not exists debt_payments_debt_idx
  on public.debt_payments(debt_id, payment_date desc, created_at desc);

alter table public.debts_receivables enable row level security;
alter table public.debt_payments enable row level security;

drop policy if exists debts_receivables_select_own on public.debts_receivables;
drop policy if exists debts_receivables_insert_own on public.debts_receivables;
drop policy if exists debts_receivables_update_own on public.debts_receivables;
drop policy if exists debts_receivables_delete_own on public.debts_receivables;
create policy debts_receivables_select_own on public.debts_receivables for select using (auth.uid() = user_id);
create policy debts_receivables_insert_own on public.debts_receivables for insert with check (auth.uid() = user_id);
create policy debts_receivables_update_own on public.debts_receivables for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy debts_receivables_delete_own on public.debts_receivables for delete using (auth.uid() = user_id);

drop policy if exists debt_payments_select_own on public.debt_payments;
drop policy if exists debt_payments_insert_own on public.debt_payments;
drop policy if exists debt_payments_update_own on public.debt_payments;
drop policy if exists debt_payments_delete_own on public.debt_payments;
create policy debt_payments_select_own on public.debt_payments for select using (auth.uid() = user_id);
create policy debt_payments_insert_own on public.debt_payments for insert with check (auth.uid() = user_id);
create policy debt_payments_update_own on public.debt_payments for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy debt_payments_delete_own on public.debt_payments for delete using (auth.uid() = user_id);

create or replace function public.set_debt_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_debts_receivables_updated_at on public.debts_receivables;
create trigger trg_debts_receivables_updated_at
before update on public.debts_receivables
for each row execute function public.set_debt_updated_at();

comment on table public.debts_receivables is 'Barokah Telur V70.3.7 - Utang Piutang, terpisah dari transactions';
comment on table public.debt_payments is 'Barokah Telur V70.3.7 - Riwayat pembayaran utang/piutang';