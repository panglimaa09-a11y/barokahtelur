-- BAROKAH TELUR V70.3.6
-- Shared data + multiple login accounts.
-- IMPORTANT: run this migration in Supabase SQL Editor BEFORE using the V70.3.6 app.

begin;

-- 1) Keep profile email/name available for the Owner account manager.
alter table public.profiles add column if not exists email text;

-- 2) Allow employee accounts in addition to the existing owner/admin roles.
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('owner','admin','employee'));

-- 3) Backfill profile emails from Supabase Auth for existing accounts.
update public.profiles p
set email = u.email
from auth.users u
where u.id = p.id and (p.email is null or p.email = '');

-- 4) Shared-data policies.
-- Every authenticated account sees the same transactions and stock history.
-- New rows are still stamped with the account that created them in user_id.
drop policy if exists transactions_select_own on public.transactions;
drop policy if exists transactions_insert_own on public.transactions;
drop policy if exists transactions_update_own on public.transactions;
drop policy if exists transactions_delete_own on public.transactions;
drop policy if exists transactions_select_shared on public.transactions;
drop policy if exists transactions_insert_shared on public.transactions;
drop policy if exists transactions_update_shared on public.transactions;
drop policy if exists transactions_delete_shared on public.transactions;

create policy transactions_select_shared on public.transactions
for select to authenticated using (true);

create policy transactions_insert_shared on public.transactions
for insert to authenticated with check (auth.uid() = user_id);

create policy transactions_update_shared on public.transactions
for update to authenticated using (true) with check (auth.uid() = user_id);

create policy transactions_delete_shared on public.transactions
for delete to authenticated using (true);

-- Stock is shared in exactly the same way.
drop policy if exists stock_select_own on public.stock_movements;
drop policy if exists stock_insert_own on public.stock_movements;
drop policy if exists stock_delete_own on public.stock_movements;
drop policy if exists stock_select_shared on public.stock_movements;
drop policy if exists stock_insert_shared on public.stock_movements;
drop policy if exists stock_delete_shared on public.stock_movements;

create policy stock_select_shared on public.stock_movements
for select to authenticated using (true);

create policy stock_insert_shared on public.stock_movements
for insert to authenticated with check (auth.uid() = user_id);

create policy stock_delete_shared on public.stock_movements
for delete to authenticated using (true);

-- 5) Owner can read all profiles so the account manager can list accounts.
drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_select_owner_all on public.profiles;
create policy profiles_select_owner_all on public.profiles
for select to authenticated
using (
  auth.uid() = id
  or exists (
    select 1 from public.profiles me
    where me.id = auth.uid() and me.role = 'owner'
  )
);

-- 6) New Auth users created by the account manager become employees.
-- Existing owner/admin profiles are preserved.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name',''),
    new.email,
    case
      when coalesce(new.raw_user_meta_data->>'role','') = 'employee' then 'employee'
      else 'owner'
    end
  )
  on conflict (id) do update
  set full_name = excluded.full_name,
      email = excluded.email;
  return new;
end;
$$;

commit;
