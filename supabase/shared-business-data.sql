-- Barokah Telur: shared business data for all admin accounts.
-- Run once in Supabase SQL Editor after shared-admin.sql.
-- Existing rows are NOT deleted or reassigned.

alter table public.debts_receivables enable row level security;
alter table public.debt_payments enable row level security;
alter table public.operational_transactions enable row level security;

-- UTANG / PIUTANG
DROP POLICY IF EXISTS debts_receivables_select_shared_admin ON public.debts_receivables;
DROP POLICY IF EXISTS debts_receivables_insert_shared_admin ON public.debts_receivables;
DROP POLICY IF EXISTS debts_receivables_update_shared_admin ON public.debts_receivables;
DROP POLICY IF EXISTS debts_receivables_delete_shared_admin ON public.debts_receivables;
CREATE POLICY debts_receivables_select_shared_admin ON public.debts_receivables FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY debts_receivables_insert_shared_admin ON public.debts_receivables FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR public.is_admin());
CREATE POLICY debts_receivables_update_shared_admin ON public.debts_receivables FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());
CREATE POLICY debts_receivables_delete_shared_admin ON public.debts_receivables FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

-- PEMBAYARAN UTANG / PIUTANG
DROP POLICY IF EXISTS debt_payments_select_shared_admin ON public.debt_payments;
DROP POLICY IF EXISTS debt_payments_insert_shared_admin ON public.debt_payments;
DROP POLICY IF EXISTS debt_payments_update_shared_admin ON public.debt_payments;
DROP POLICY IF EXISTS debt_payments_delete_shared_admin ON public.debt_payments;
CREATE POLICY debt_payments_select_shared_admin ON public.debt_payments FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY debt_payments_insert_shared_admin ON public.debt_payments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR public.is_admin());
CREATE POLICY debt_payments_update_shared_admin ON public.debt_payments FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());
CREATE POLICY debt_payments_delete_shared_admin ON public.debt_payments FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

-- TRANSAKSI OPERASIONAL
DROP POLICY IF EXISTS operational_transactions_select_shared_admin ON public.operational_transactions;
DROP POLICY IF EXISTS operational_transactions_insert_shared_admin ON public.operational_transactions;
DROP POLICY IF EXISTS operational_transactions_update_shared_admin ON public.operational_transactions;
DROP POLICY IF EXISTS operational_transactions_delete_shared_admin ON public.operational_transactions;
CREATE POLICY operational_transactions_select_shared_admin ON public.operational_transactions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY operational_transactions_insert_shared_admin ON public.operational_transactions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR public.is_admin());
CREATE POLICY operational_transactions_update_shared_admin ON public.operational_transactions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());
CREATE POLICY operational_transactions_delete_shared_admin ON public.operational_transactions FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());
