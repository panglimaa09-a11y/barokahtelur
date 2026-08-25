-- BAROKAH TELUR — PREVIEW ONLY
-- Safe/idempotent repair for Utang Piutang save.
-- Run this once in Supabase SQL Editor if the preview reports a schema/RLS error.

alter table if exists public.debts_receivables
  add column if not exists quantity numeric(14,3) not null default 1;

alter table if exists public.debts_receivables
  add column if not exists unit text not null default 'Paket';

alter table if exists public.debts_receivables enable row level security;

drop policy if exists debts_receivables_select_own on public.debts_receivables;
drop policy if exists debts_receivables_insert_own on public.debts_receivables;
drop policy if exists debts_receivables_update_own on public.debts_receivables;
drop policy if exists debts_receivables_delete_own on public.debts_receivables;

create policy debts_receivables_select_own
  on public.debts_receivables for select
  using (auth.uid() = user_id);

create policy debts_receivables_insert_own
  on public.debts_receivables for insert
  with check (auth.uid() = user_id);

create policy debts_receivables_update_own
  on public.debts_receivables for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy debts_receivables_delete_own
  on public.debts_receivables for delete
  using (auth.uid() = user_id);

-- Ask PostgREST to refresh its schema cache after the column repair.
notify pgrst, 'reload schema';
