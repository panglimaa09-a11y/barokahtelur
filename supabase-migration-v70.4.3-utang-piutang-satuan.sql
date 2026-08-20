-- Barokah Telur V70.4.3 - satuan pada Utang Piutang
-- Jalankan sekali di Supabase. Aman dijalankan ulang.

ALTER TABLE public.debts_receivables
  ADD COLUMN IF NOT EXISTS quantity numeric(14,3) NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS unit text NOT NULL DEFAULT 'Paket';

CREATE INDEX IF NOT EXISTS debts_receivables_user_unit_idx
  ON public.debts_receivables(user_id, unit);

-- Minta PostgREST memuat ulang schema agar quantity/unit langsung dikenali.
NOTIFY pgrst, 'reload schema';
