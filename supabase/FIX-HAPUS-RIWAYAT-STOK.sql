-- ============================================================
-- PERBAIKAN: "Hapus Riwayat Stok" -> "DELETE requires a WHERE clause"
-- ============================================================
-- CARA PAKAI (1 menit):
-- 1. Buka https://supabase.com/dashboard -> pilih project Barokah Telur
--    (URL: https://sdshagdvwhryjygvwgkn.supabase.co)
-- 2. Klik "SQL Editor" di menu kiri -> "New query"
-- 3. Copy SEMUA isi file ini -> paste -> klik "Run"
-- 4. Tunggu sampai muncul "Success"
--
-- Efek: fungsi clear_own_stock_movements() diperbarui agar lolos
-- pengaman pg-safeupdate Supabase (cabang admin pakai WHERE true).
-- ============================================================

CREATE OR REPLACE FUNCTION public.clear_own_stock_movements()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_admin boolean;
  v_deleted integer := 0;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sesi login tidak aktif.';
  END IF;

  v_admin := public.is_admin();

  -- Serialize all warehouse mutations.
  PERFORM pg_advisory_xact_lock(hashtext('barokah_telur_warehouse_stock'));

  IF v_admin THEN
    -- WHERE true: lolos pg-safeupdate (Supabase menolak DELETE tanpa WHERE).
    DELETE FROM public.stock_movements WHERE true;
  ELSE
    DELETE FROM public.stock_movements
    WHERE user_id = v_uid;
  END IF;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  RETURN jsonb_build_object(
    'ok', true,
    'deleted_count', v_deleted,
    'reset_saldo_butir', 0
  );
END;
$$;

REVOKE ALL ON FUNCTION public.clear_own_stock_movements() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.clear_own_stock_movements() TO authenticated;
