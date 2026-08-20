-- Barokah Telur V70.4.3 - satuan pada Utang Piutang
-- Jalankan sekali di Supabase. Tidak menghapus atau mengubah data lama.

alter table public.debts_receivables
  add column if not exists quantity numeric(14,3) not null default 1,
  add column if not exists unit text not null default 'Paket';

create index if not exists debts_receivables_user_unit_idx
  on public.debts_receivables(user_id, unit);
