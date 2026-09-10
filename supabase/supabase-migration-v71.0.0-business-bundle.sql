-- BAROKAH TELUR V71.0.0
-- Business bundle: transaction + warehouse movement + transfer proof metadata.
-- One client-generated transaction UUID is the bundle UUID.
-- Run once in Supabase SQL Editor.

create extension if not exists pgcrypto;

alter table public.stock_movements
  add column if not exists transaction_id uuid references public.transactions(id) on delete set null;
create index if not exists stock_movements_transaction_idx
  on public.stock_movements(transaction_id, created_at);
create index if not exists transactions_id_user_idx
  on public.transactions(id, user_id);

-- Shared business access for authenticated admin/owner accounts. Profile/account data stays private.
DROP POLICY IF EXISTS transactions_select_shared_admin ON public.transactions;
DROP POLICY IF EXISTS transactions_insert_shared_admin ON public.transactions;
DROP POLICY IF EXISTS transactions_update_shared_admin ON public.transactions;
DROP POLICY IF EXISTS transactions_delete_shared_admin ON public.transactions;
CREATE POLICY transactions_select_shared_admin ON public.transactions FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY transactions_insert_shared_admin ON public.transactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR public.is_admin());
CREATE POLICY transactions_update_shared_admin ON public.transactions FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.is_admin()) WITH CHECK (auth.uid() = user_id OR public.is_admin());
CREATE POLICY transactions_delete_shared_admin ON public.transactions FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS stock_select_shared_admin ON public.stock_movements;
DROP POLICY IF EXISTS stock_insert_shared_admin ON public.stock_movements;
DROP POLICY IF EXISTS stock_update_shared_admin ON public.stock_movements;
DROP POLICY IF EXISTS stock_delete_shared_admin ON public.stock_movements;
CREATE POLICY stock_select_shared_admin ON public.stock_movements FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY stock_insert_shared_admin ON public.stock_movements FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR public.is_admin());
CREATE POLICY stock_update_shared_admin ON public.stock_movements FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.is_admin()) WITH CHECK (auth.uid() = user_id OR public.is_admin());
CREATE POLICY stock_delete_shared_admin ON public.stock_movements FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS transaction_proofs_select_shared_admin ON public.transaction_proofs;
DROP POLICY IF EXISTS transaction_proofs_insert_shared_admin ON public.transaction_proofs;
DROP POLICY IF EXISTS transaction_proofs_update_shared_admin ON public.transaction_proofs;
DROP POLICY IF EXISTS transaction_proofs_delete_shared_admin ON public.transaction_proofs;
CREATE POLICY transaction_proofs_select_shared_admin ON public.transaction_proofs FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY transaction_proofs_insert_shared_admin ON public.transaction_proofs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR public.is_admin());
CREATE POLICY transaction_proofs_update_shared_admin ON public.transaction_proofs FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.is_admin()) WITH CHECK (auth.uid() = user_id OR public.is_admin());
CREATE POLICY transaction_proofs_delete_shared_admin ON public.transaction_proofs FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.is_admin());

-- Storage access for admins so Owner B can view Owner A's proof image through a signed URL.
DROP POLICY IF EXISTS bukti_transfer_select_shared_admin ON storage.objects;
DROP POLICY IF EXISTS bukti_transfer_delete_shared_admin ON storage.objects;
CREATE POLICY bukti_transfer_select_shared_admin ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id='bukti-transfer' AND ((storage.foldername(name))[1]=(select auth.uid()::text) OR public.is_admin()));
CREATE POLICY bukti_transfer_delete_shared_admin ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id='bukti-transfer' AND ((storage.foldername(name))[1]=(select auth.uid()::text) OR public.is_admin()));

-- DB transaction is atomic. Storage bytes are uploaded first; if this RPC fails, the browser removes them.
drop function if exists public.save_business_bundle(text,text,numeric,text,numeric,numeric,date,jsonb,jsonb,uuid);
create or replace function public.save_business_bundle(
  p_type text,
  p_note text,
  p_price numeric,
  p_unit text,
  p_qty numeric,
  p_total numeric,
  p_transaction_date date,
  p_stock jsonb default null,
  p_proofs jsonb default '[]'::jsonb,
  p_transaction_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_tx public.transactions%rowtype;
  v_stock jsonb;
  v_delta numeric;
  v_current numeric;
  v_after numeric;
  v_proof jsonb;
  v_txid uuid := coalesce(p_transaction_id,gen_random_uuid());
begin
  if v_user is null then raise exception 'Sesi login tidak aktif.' using errcode='42501'; end if;
  if p_type not in ('income','expense') then raise exception 'Tipe transaksi tidak valid.'; end if;
  if coalesce(trim(p_note),'')='' then raise exception 'Keterangan transaksi wajib diisi.'; end if;
  if p_qty is null or p_qty<=0 then raise exception 'Jumlah transaksi harus lebih dari 0.'; end if;
  if p_price is null or p_price<0 then raise exception 'Harga transaksi tidak valid.'; end if;
  if p_transaction_date is null then raise exception 'Tanggal transaksi wajib diisi.'; end if;

  perform pg_advisory_xact_lock(hashtext('barokah_telur_warehouse_bundle'));

  insert into public.transactions(id,user_id,type,note,price,unit,qty,total,transaction_date)
  values(v_txid,v_user,p_type,p_note,p_price,p_unit,p_qty,coalesce(p_total,round(p_price*p_qty,3)),p_transaction_date)
  returning * into v_tx;

  v_current := coalesce((select sum(delta_butir) from public.stock_movements where product='Telur Ayam Ras'),0);
  if jsonb_typeof(coalesce(p_stock,'null'::jsonb))='object' then
    v_stock:=p_stock;
    v_delta:=coalesce((v_stock->>'delta_butir')::numeric,0);
    if v_delta<>0 then
      v_after:=v_current+v_delta;
      if v_after<0 then raise exception 'Stok Gudang tidak mencukupi. Saldo saat ini % Butir.',v_current; end if;
      insert into public.stock_movements(user_id,product,movement_type,qty,unit,delta_butir,saldo_after_butir,note,transaction_id)
      values(v_user,'Telur Ayam Ras',coalesce(v_stock->>'movement_type',case when v_delta>0 then 'Masuk' else 'Keluar' end),coalesce((v_stock->>'qty')::numeric,abs(v_delta)),coalesce(v_stock->>'unit','Butir'),v_delta,v_after,coalesce(v_stock->>'note',''),v_tx.id);
    end if;
  end if;

  if jsonb_typeof(coalesce(p_proofs,'[]'::jsonb))='array' then
    for v_proof in select value from jsonb_array_elements(p_proofs) loop
      insert into public.transaction_proofs(user_id,transaction_id,storage_path,file_name,mime_type,file_size)
      values(v_user,v_tx.id,v_proof->>'storage_path',coalesce(v_proof->>'file_name','Bukti Transfer'),v_proof->>'mime_type',(v_proof->>'file_size')::bigint);
    end loop;
  end if;

  return jsonb_build_object('transaction',to_jsonb(v_tx),'transaction_id',v_tx.id,
    'stock',coalesce((select to_jsonb(sm) from public.stock_movements sm where sm.transaction_id=v_tx.id order by sm.created_at desc limit 1),'null'::jsonb),
    'proof_count',(select count(*) from public.transaction_proofs where transaction_id=v_tx.id));
end;
$$;

grant execute on function public.save_business_bundle(text,text,numeric,text,numeric,numeric,date,jsonb,jsonb,uuid) to authenticated;

drop view if exists public.business_transaction_bundles;
create view public.business_transaction_bundles with (security_invoker=true) as
select t.id as transaction_id,t.user_id,t.type,t.note,t.price,t.unit,t.qty,t.total,t.transaction_date,t.created_at,t.updated_at,
       sm.id as stock_movement_id,sm.movement_type,sm.qty as stock_qty,sm.unit as stock_unit,sm.delta_butir,sm.saldo_after_butir,sm.note as stock_note,
       coalesce((select count(*) from public.transaction_proofs tp where tp.transaction_id=t.id),0) as proof_count
from public.transactions t left join public.stock_movements sm on sm.transaction_id=t.id;

comment on function public.save_business_bundle(text,text,numeric,text,numeric,numeric,date,jsonb,jsonb,uuid)
is 'V71: atomic DB save of one business bundle: transaction + optional stock movement + optional proof metadata.';
