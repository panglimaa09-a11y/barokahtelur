-- BAROKAH TELUR V70.1 - database hardening
-- Jalankan setelah schema V70 sukses. Tidak menghapus data.

alter table public.stock_movements
  alter column note set default '';

-- Ensure the running-balance view is the source of truth for saldo setelah.
-- The stored saldo_after_butir remains as an audit snapshot, but UI should use
-- calculated_saldo_after_butir so deleting/resetting history cannot leave stale balances.
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

-- Helpful indexes for durable reads and ordering.
create index if not exists stock_movements_user_product_created_idx
  on public.stock_movements(user_id, product, created_at, id);

create index if not exists transactions_user_created_idx
  on public.transactions(user_id, created_at desc, id);
