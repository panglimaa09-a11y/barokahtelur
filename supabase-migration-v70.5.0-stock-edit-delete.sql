-- BAROKAH TELUR V70.5.0
-- Allow each logged-in owner to edit/delete only their own stock movement.
-- Run this once in Supabase SQL Editor before testing the Preview.

alter table public.stock_movements enable row level security;

drop policy if exists stock_update_own on public.stock_movements;
create policy stock_update_own
on public.stock_movements
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists stock_delete_own on public.stock_movements;
create policy stock_delete_own
on public.stock_movements
for delete
using (auth.uid() = user_id);

notify pgrst, 'reload schema';
