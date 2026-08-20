-- BAROKAH TELUR V70.4.6
-- Allow each logged-in owner to edit/delete only their own stock movement.
-- Run this migration in Supabase before testing Edit Stok.

alter table public.stock_movements enable row level security;

drop policy if exists stock_update_own on public.stock_movements;
create policy stock_update_own
on public.stock_movements
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Delete policy already exists in the base schema; keep it scoped per owner.
drop policy if exists stock_delete_own on public.stock_movements;
create policy stock_delete_own
on public.stock_movements
for delete
using (auth.uid() = user_id);

notify pgrst, 'reload schema';
