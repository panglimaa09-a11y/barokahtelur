-- BAROKAH TELUR V70.4.7
-- Aktifkan Supabase Realtime untuk sinkronisasi transaksi operasional.
-- Aman dijalankan ulang.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'operational_transactions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.operational_transactions;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
