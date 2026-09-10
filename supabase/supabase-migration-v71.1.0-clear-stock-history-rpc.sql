-- Barokah Telur V71.1.0
-- Dedicated atomic bulk stock-history reset.
-- This intentionally does NOT validate intermediate historical balances:
-- the final ledger is empty, so the resulting warehouse balance is 0.

BEGIN;

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
    DELETE FROM public.stock_movements;
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

COMMIT;
