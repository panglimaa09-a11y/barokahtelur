-- BAROKAH TELUR V70.3.8
-- Transaksi Operasional: modul terpisah dari transactions dan utang/piutang.
-- Tidak menghapus atau mengubah data lama.

create sequence if not exists public.operational_transaction_no_seq
  as bigint start with 1 increment by 1 minvalue 1 no cycle cache 1;

create table if not exists public.operational_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('pemasukan','pengeluaran')),
  category text not null default 'Lainnya',
  description text not null,
  reference_no text,
  transaction_date date not null default current_date,
  amount numeric(14,2) not null check (amount > 0),
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_operational_transaction_no()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  n bigint;
begin
  if coalesce(btrim(new.reference_no),'') = '' then
    n := nextval('public.operational_transaction_no_seq');
    new.reference_no := 'OPR-' || to_char(coalesce(new.transaction_date,current_date),'YYYYMMDD') || '-' || lpad(n::text,6,'0');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_operational_transaction_no on public.operational_transactions;
create trigger trg_set_operational_transaction_no
before insert on public.operational_transactions
for each row execute function public.set_operational_transaction_no();

create or replace function public.set_operational_transaction_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_operational_transactions_updated_at on public.operational_transactions;
create trigger trg_operational_transactions_updated_at
before update on public.operational_transactions
for each row execute function public.set_operational_transaction_updated_at();

create unique index if not exists operational_transactions_user_reference_unique
  on public.operational_transactions(user_id, reference_no)
  where reference_no is not null and btrim(reference_no) <> '';

create index if not exists operational_transactions_user_date_idx
  on public.operational_transactions(user_id, transaction_date desc, created_at desc);

create index if not exists operational_transactions_user_kind_idx
  on public.operational_transactions(user_id, kind, transaction_date desc, created_at desc);

alter table public.operational_transactions enable row level security;

drop policy if exists operational_transactions_select_own on public.operational_transactions;
drop policy if exists operational_transactions_insert_own on public.operational_transactions;
drop policy if exists operational_transactions_update_own on public.operational_transactions;
drop policy if exists operational_transactions_delete_own on public.operational_transactions;

create policy operational_transactions_select_own
  on public.operational_transactions for select
  using (auth.uid() = user_id);

create policy operational_transactions_insert_own
  on public.operational_transactions for insert
  with check (auth.uid() = user_id);

create policy operational_transactions_update_own
  on public.operational_transactions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy operational_transactions_delete_own
  on public.operational_transactions for delete
  using (auth.uid() = user_id);

-- Backfill only missing references. Existing numbers are preserved.
update public.operational_transactions o
set reference_no = 'OPR-' || to_char(coalesce(o.transaction_date,current_date),'YYYYMMDD') || '-' || lpad(nextval('public.operational_transaction_no_seq')::text,6,'0')
where coalesce(btrim(o.reference_no),'') = '';

comment on table public.operational_transactions is
  'Barokah Telur V70.3.8 - transaksi operasional, terpisah dari transactions dan utang/piutang';
