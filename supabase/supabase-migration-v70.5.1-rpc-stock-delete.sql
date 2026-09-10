-- Barokah Telur V70.5.1
-- Atomic stock edit/delete RPCs.
-- IMPORTANT: stock_movements.id is UUID in the current schema.
-- Run this migration in Supabase SQL Editor before testing Edit/Hapus Stok.

BEGIN;

-- RLS: normal users can manage their own stock rows.
-- Admins can manage the shared warehouse history.
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS stock_movements_select_own_or_admin ON public.stock_movements;
CREATE POLICY stock_movements_select_own_or_admin
ON public.stock_movements
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS stock_movements_insert_own ON public.stock_movements;
CREATE POLICY stock_movements_insert_own
ON public.stock_movements
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS stock_movements_update_own_or_admin ON public.stock_movements;
CREATE POLICY stock_movements_update_own_or_admin
ON public.stock_movements
FOR UPDATE
TO authenticated
USING (user_id = auth.uid() OR public.is_admin())
WITH CHECK (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS stock_movements_delete_own_or_admin ON public.stock_movements;
CREATE POLICY stock_movements_delete_own_or_admin
ON public.stock_movements
FOR DELETE
TO authenticated
USING (user_id = auth.uid() OR public.is_admin());

-- Remove older overloads if a previous migration created bigint signatures.
DROP FUNCTION IF EXISTS public.delete_own_stock_movement(bigint);
DROP FUNCTION IF EXISTS public.update_own_stock_movement(bigint,text,numeric,text,text,numeric);

-- Delete one stock movement and rebuild saldo_after_butir atomically.
CREATE OR REPLACE FUNCTION public.delete_own_stock_movement(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_admin boolean;
  v_found boolean;
  v_bad boolean;
  v_deleted_delta numeric;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sesi login tidak aktif.';
  END IF;

  v_admin := public.is_admin();

  -- Serialize warehouse mutations so two browsers cannot recalculate saldo concurrently.
  PERFORM pg_advisory_xact_lock(hashtext('barokah_telur_warehouse_stock'));

  IF v_admin THEN
    SELECT EXISTS (
      SELECT 1 FROM public.stock_movements WHERE id = p_id
    ) INTO v_found;
  ELSE
    SELECT EXISTS (
      SELECT 1 FROM public.stock_movements
      WHERE id = p_id AND user_id = v_uid
    ) INTO v_found;
  END IF;

  IF NOT v_found THEN
    RAISE EXCEPTION 'Data stok tidak ditemukan atau tidak diizinkan.';
  END IF;

  SELECT delta_butir INTO v_deleted_delta
  FROM public.stock_movements
  WHERE id = p_id;

  -- Validate the resulting running balance before deleting.
  -- For admins the warehouse is shared; for normal users the scope is their own rows.
  IF v_admin THEN
    SELECT EXISTS (
      SELECT 1
      FROM (
        SELECT COALESCE(SUM(delta_butir) OVER (
          ORDER BY created_at, id
          ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
        ), 0) AS running_saldo
        FROM public.stock_movements
        WHERE id <> p_id
      ) q
      WHERE q.running_saldo < 0
    ) INTO v_bad;
  ELSE
    SELECT EXISTS (
      SELECT 1
      FROM (
        SELECT COALESCE(SUM(delta_butir) OVER (
          ORDER BY created_at, id
          ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
        ), 0) AS running_saldo
        FROM public.stock_movements
        WHERE user_id = v_uid AND id <> p_id
      ) q
      WHERE q.running_saldo < 0
    ) INTO v_bad;
  END IF;

  IF v_bad THEN
    RAISE EXCEPTION 'Penghapusan ditolak karena saldo stok historis akan menjadi negatif.';
  END IF;

  DELETE FROM public.stock_movements WHERE id = p_id;

  -- Recalculate every remaining row in one UPDATE statement.
  -- This avoids the old browser-side sequential update that could temporarily violate
  -- stock_movements_saldo_after_butir_check.
  IF v_admin THEN
    WITH recalculated AS (
      SELECT
        id,
        COALESCE(SUM(delta_butir) OVER (
          ORDER BY created_at, id
          ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
        ), 0) AS new_saldo
      FROM public.stock_movements
    )
    UPDATE public.stock_movements sm
    SET saldo_after_butir = r.new_saldo
    FROM recalculated r
    WHERE sm.id = r.id;
  ELSE
    WITH recalculated AS (
      SELECT
        id,
        COALESCE(SUM(delta_butir) OVER (
          ORDER BY created_at, id
          ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
        ), 0) AS new_saldo
      FROM public.stock_movements
      WHERE user_id = v_uid
    )
    UPDATE public.stock_movements sm
    SET saldo_after_butir = r.new_saldo
    FROM recalculated r
    WHERE sm.id = r.id
      AND sm.user_id = v_uid;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'deleted_id', p_id,
    'deleted_delta_butir', v_deleted_delta
  );
END;
$$;

-- Update one stock movement and rebuild saldo_after_butir atomically.
CREATE OR REPLACE FUNCTION public.update_own_stock_movement(
  p_id uuid,
  p_movement_type text,
  p_qty numeric,
  p_unit text,
  p_note text,
  p_delta_butir numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_admin boolean;
  v_found boolean;
  v_bad boolean;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sesi login tidak aktif.';
  END IF;

  IF p_movement_type NOT IN ('Masuk','Keluar','Retak','Tidak Layak') THEN
    RAISE EXCEPTION 'Jenis perubahan stok tidak valid.';
  END IF;

  IF p_qty IS NULL OR p_qty <= 0 THEN
    RAISE EXCEPTION 'Jumlah stok harus lebih dari 0.';
  END IF;

  IF p_unit IS NULL OR btrim(p_unit) = '' THEN
    RAISE EXCEPTION 'Satuan wajib diisi.';
  END IF;

  IF p_delta_butir IS NULL THEN
    RAISE EXCEPTION 'Delta stok tidak valid.';
  END IF;

  v_admin := public.is_admin();
  PERFORM pg_advisory_xact_lock(hashtext('barokah_telur_warehouse_stock'));

  IF v_admin THEN
    SELECT EXISTS (SELECT 1 FROM public.stock_movements WHERE id = p_id) INTO v_found;
  ELSE
    SELECT EXISTS (
      SELECT 1 FROM public.stock_movements
      WHERE id = p_id AND user_id = v_uid
    ) INTO v_found;
  END IF;

  IF NOT v_found THEN
    RAISE EXCEPTION 'Data stok tidak ditemukan atau tidak diizinkan.';
  END IF;

  -- Evaluate the complete resulting ledger before writing it.
  IF v_admin THEN
    SELECT EXISTS (
      SELECT 1
      FROM (
        SELECT COALESCE(SUM(
          CASE WHEN id = p_id THEN p_delta_butir ELSE delta_butir END
        ) OVER (
          ORDER BY created_at, id
          ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
        ), 0) AS running_saldo
        FROM public.stock_movements
      ) q
      WHERE q.running_saldo < 0
    ) INTO v_bad;
  ELSE
    SELECT EXISTS (
      SELECT 1
      FROM (
        SELECT COALESCE(SUM(
          CASE WHEN id = p_id THEN p_delta_butir ELSE delta_butir END
        ) OVER (
          ORDER BY created_at, id
          ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
        ), 0) AS running_saldo
        FROM public.stock_movements
        WHERE user_id = v_uid
      ) q
      WHERE q.running_saldo < 0
    ) INTO v_bad;
  END IF;

  IF v_bad THEN
    RAISE EXCEPTION 'Perubahan ditolak karena saldo stok historis akan menjadi negatif.';
  END IF;

  -- One UPDATE statement applies the new row data and the final recalculated saldo.
  IF v_admin THEN
    WITH recalculated AS (
      SELECT
        id,
        COALESCE(SUM(
          CASE WHEN id = p_id THEN p_delta_butir ELSE delta_butir END
        ) OVER (
          ORDER BY created_at, id
          ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
        ), 0) AS new_saldo
      FROM public.stock_movements
    )
    UPDATE public.stock_movements sm
    SET movement_type = CASE WHEN sm.id = p_id THEN p_movement_type ELSE sm.movement_type END,
        qty = CASE WHEN sm.id = p_id THEN p_qty ELSE sm.qty END,
        unit = CASE WHEN sm.id = p_id THEN btrim(p_unit) ELSE sm.unit END,
        note = CASE WHEN sm.id = p_id THEN COALESCE(p_note,'') ELSE sm.note END,
        delta_butir = CASE WHEN sm.id = p_id THEN p_delta_butir ELSE sm.delta_butir END,
        saldo_after_butir = r.new_saldo
    FROM recalculated r
    WHERE sm.id = r.id;
  ELSE
    WITH recalculated AS (
      SELECT
        id,
        COALESCE(SUM(
          CASE WHEN id = p_id THEN p_delta_butir ELSE delta_butir END
        ) OVER (
          ORDER BY created_at, id
          ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
        ), 0) AS new_saldo
      FROM public.stock_movements
      WHERE user_id = v_uid
    )
    UPDATE public.stock_movements sm
    SET movement_type = CASE WHEN sm.id = p_id THEN p_movement_type ELSE sm.movement_type END,
        qty = CASE WHEN sm.id = p_id THEN p_qty ELSE sm.qty END,
        unit = CASE WHEN sm.id = p_id THEN btrim(p_unit) ELSE sm.unit END,
        note = CASE WHEN sm.id = p_id THEN COALESCE(p_note,'') ELSE sm.note END,
        delta_butir = CASE WHEN sm.id = p_id THEN p_delta_butir ELSE sm.delta_butir END,
        saldo_after_butir = r.new_saldo
    FROM recalculated r
    WHERE sm.id = r.id
      AND sm.user_id = v_uid;
  END IF;

  RETURN jsonb_build_object('ok', true, 'id', p_id);
END;
$$;

REVOKE ALL ON FUNCTION public.delete_own_stock_movement(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_own_stock_movement(uuid,text,numeric,text,text,numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_own_stock_movement(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_own_stock_movement(uuid,text,numeric,text,text,numeric) TO authenticated;

COMMIT;
