-- Barokah Telur: persistent transfer proof storage
-- Run this once in Supabase SQL Editor.

create table if not exists public.transaction_proofs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null check (mime_type in ('image/jpeg','image/png','image/webp')),
  file_size bigint not null check (file_size > 0 and file_size <= 8388608),
  created_at timestamptz not null default now()
);

create index if not exists transaction_proofs_user_tx_idx
  on public.transaction_proofs(user_id, transaction_id, created_at);

alter table public.transaction_proofs enable row level security;

-- Re-runnable policies.
drop policy if exists "transaction_proofs_select_own" on public.transaction_proofs;
drop policy if exists "transaction_proofs_insert_own" on public.transaction_proofs;
drop policy if exists "transaction_proofs_delete_own" on public.transaction_proofs;

create policy "transaction_proofs_select_own"
  on public.transaction_proofs
  for select to authenticated
  using (auth.uid() = user_id);

create policy "transaction_proofs_insert_own"
  on public.transaction_proofs
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.transactions t
      where t.id = transaction_id and t.user_id = auth.uid()
    )
  );

create policy "transaction_proofs_delete_own"
  on public.transaction_proofs
  for delete to authenticated
  using (auth.uid() = user_id);

-- Private Storage bucket: actual image bytes live here; metadata lives above.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'bukti-transfer',
  'bukti-transfer',
  false,
  8388608,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do update set
  public = false,
  file_size_limit = 8388608,
  allowed_mime_types = array['image/jpeg','image/png','image/webp'];

-- Storage path format: <auth.uid>/<transaction_id>/<random>.<ext>
drop policy if exists "bukti_transfer_select_own" on storage.objects;
drop policy if exists "bukti_transfer_insert_own" on storage.objects;
drop policy if exists "bukti_transfer_delete_own" on storage.objects;

create policy "bukti_transfer_select_own"
  on storage.objects
  for select to authenticated
  using (
    bucket_id = 'bukti-transfer'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "bukti_transfer_insert_own"
  on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'bukti-transfer'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "bukti_transfer_delete_own"
  on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'bukti-transfer'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );
