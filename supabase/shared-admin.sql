-- Barokah Telur: SAFE shared-admin migration
-- Run this in Supabase SQL Editor AFTER the Auth user for the second admin exists.
-- This migration does not delete or overwrite transaction data.

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

drop policy if exists "admin_users_select_self" on public.admin_users;
create policy "admin_users_select_self"
  on public.admin_users for select to authenticated
  using (auth.uid() = user_id);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users a
    where a.user_id = auth.uid()
  );
$$;

-- Register the requested second admin. The Auth account must already exist.
insert into public.admin_users (user_id, email)
select id, lower(email)
from auth.users
where lower(email) = lower('kenangalinangkung4444@gmail.com')
on conflict (user_id) do update set email = excluded.email;

-- Shared transaction access: owners retain access, admins can manage all rows.
alter table public.transactions enable row level security;

drop policy if exists "transactions_select_own" on public.transactions;
drop policy if exists "transactions_insert_own" on public.transactions;
drop policy if exists "transactions_update_own" on public.transactions;
drop policy if exists "transactions_delete_own" on public.transactions;
drop policy if exists "transactions_select_shared_admin" on public.transactions;
drop policy if exists "transactions_insert_shared_admin" on public.transactions;
drop policy if exists "transactions_update_shared_admin" on public.transactions;
drop policy if exists "transactions_delete_shared_admin" on public.transactions;

create policy "transactions_select_shared_admin"
  on public.transactions for select to authenticated
  using (auth.uid() = user_id or public.is_admin());

create policy "transactions_insert_shared_admin"
  on public.transactions for insert to authenticated
  with check (auth.uid() = user_id or public.is_admin());

create policy "transactions_update_shared_admin"
  on public.transactions for update to authenticated
  using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id or public.is_admin());

create policy "transactions_delete_shared_admin"
  on public.transactions for delete to authenticated
  using (auth.uid() = user_id or public.is_admin());

-- Shared transfer-proof metadata access.
alter table public.transaction_proofs enable row level security;

drop policy if exists "transaction_proofs_select_own" on public.transaction_proofs;
drop policy if exists "transaction_proofs_insert_own" on public.transaction_proofs;
drop policy if exists "transaction_proofs_delete_own" on public.transaction_proofs;
drop policy if exists "transaction_proofs_select_shared_admin" on public.transaction_proofs;
drop policy if exists "transaction_proofs_insert_shared_admin" on public.transaction_proofs;
drop policy if exists "transaction_proofs_delete_shared_admin" on public.transaction_proofs;

create policy "transaction_proofs_select_shared_admin"
  on public.transaction_proofs for select to authenticated
  using (auth.uid() = user_id or public.is_admin());

create policy "transaction_proofs_insert_shared_admin"
  on public.transaction_proofs for insert to authenticated
  with check (
    (auth.uid() = user_id and exists (
      select 1 from public.transactions t
      where t.id = transaction_id and t.user_id = auth.uid()
    ))
    or public.is_admin()
  );

create policy "transaction_proofs_delete_shared_admin"
  on public.transaction_proofs for delete to authenticated
  using (auth.uid() = user_id or public.is_admin());

-- Shared private Storage access for admins.
drop policy if exists "bukti_transfer_select_own" on storage.objects;
drop policy if exists "bukti_transfer_insert_own" on storage.objects;
drop policy if exists "bukti_transfer_delete_own" on storage.objects;
drop policy if exists "bukti_transfer_select_shared_admin" on storage.objects;
drop policy if exists "bukti_transfer_insert_shared_admin" on storage.objects;
drop policy if exists "bukti_transfer_delete_shared_admin" on storage.objects;

create policy "bukti_transfer_select_shared_admin"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'bukti-transfer'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

create policy "bukti_transfer_insert_shared_admin"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'bukti-transfer'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

create policy "bukti_transfer_delete_shared_admin"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'bukti-transfer'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );
