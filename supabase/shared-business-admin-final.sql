-- BAROKAH TELUR — FINAL SHARED ADMIN DATA
-- Jalankan SATU KALI di Supabase SQL Editor.
-- Tidak menghapus atau memindahkan data lama.

BEGIN;

CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_users_select_self ON public.admin_users;
CREATE POLICY admin_users_select_self
ON public.admin_users FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users a
    WHERE a.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  );
$$;

-- Jalankan bagian ini untuk mendaftarkan akun admin yang sudah ada.
-- Ganti email di bawah dengan email admin yang memang digunakan.
-- INSERT INTO public.admin_users(user_id,email)
-- SELECT id, lower(email) FROM auth.users
-- WHERE lower(email) IN ('admin1@email.com','admin2@email.com')
-- ON CONFLICT (user_id) DO UPDATE SET email=excluded.email;

-- UTANG / PIUTANG
ALTER TABLE public.debts_receivables ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS debts_receivables_select_shared_admin ON public.debts_receivables;
DROP POLICY IF EXISTS debts_receivables_insert_shared_admin ON public.debts_receivables;
DROP POLICY IF EXISTS debts_receivables_update_shared_admin ON public.debts_receivables;
DROP POLICY IF EXISTS debts_receivables_delete_shared_admin ON public.debts_receivables;

CREATE POLICY debts_receivables_select_shared_admin
ON public.debts_receivables FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY debts_receivables_insert_shared_admin
ON public.debts_receivables FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id OR public.is_admin());

CREATE POLICY debts_receivables_update_shared_admin
ON public.debts_receivables FOR UPDATE TO authenticated
USING (auth.uid() = user_id OR public.is_admin())
WITH CHECK (auth.uid() = user_id OR public.is_admin());

CREATE POLICY debts_receivables_delete_shared_admin
ON public.debts_receivables FOR DELETE TO authenticated
USING (auth.uid() = user_id OR public.is_admin());

-- PEMBAYARAN
ALTER TABLE public.debt_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS debt_payments_select_shared_admin ON public.debt_payments;
DROP POLICY IF EXISTS debt_payments_insert_shared_admin ON public.debt_payments;
DROP POLICY IF EXISTS debt_payments_update_shared_admin ON public.debt_payments;
DROP POLICY IF EXISTS debt_payments_delete_shared_admin ON public.debt_payments;

CREATE POLICY debt_payments_select_shared_admin
ON public.debt_payments FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY debt_payments_insert_shared_admin
ON public.debt_payments FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id OR public.is_admin());

CREATE POLICY debt_payments_update_shared_admin
ON public.debt_payments FOR UPDATE TO authenticated
USING (auth.uid() = user_id OR public.is_admin())
WITH CHECK (auth.uid() = user_id OR public.is_admin());

CREATE POLICY debt_payments_delete_shared_admin
ON public.debt_payments FOR DELETE TO authenticated
USING (auth.uid() = user_id OR public.is_admin());

-- OPERASIONAL
ALTER TABLE public.operational_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS operational_transactions_select_shared_admin ON public.operational_transactions;
DROP POLICY IF EXISTS operational_transactions_insert_shared_admin ON public.operational_transactions;
DROP POLICY IF EXISTS operational_transactions_update_shared_admin ON public.operational_transactions;
DROP POLICY IF EXISTS operational_transactions_delete_shared_admin ON public.operational_transactions;

CREATE POLICY operational_transactions_select_shared_admin
ON public.operational_transactions FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY operational_transactions_insert_shared_admin
ON public.operational_transactions FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id OR public.is_admin());

CREATE POLICY operational_transactions_update_shared_admin
ON public.operational_transactions FOR UPDATE TO authenticated
USING (auth.uid() = user_id OR public.is_admin())
WITH CHECK (auth.uid() = user_id OR public.is_admin());

CREATE POLICY operational_transactions_delete_shared_admin
ON public.operational_transactions FOR DELETE TO authenticated
USING (auth.uid() = user_id OR public.is_admin());

COMMIT;
