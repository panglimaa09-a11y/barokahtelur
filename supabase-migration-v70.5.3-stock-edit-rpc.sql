-- BAROKAH TELUR V70.5.3
-- Owner-scoped stock edit/delete with atomic saldo recalculation.

create or replace function public.recalc_stock_saldo(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_saldo numeric := 0;
begin
  for r in
    select id, coalesce(delta_butir,0) as delta_butir
    from public.stock_movements
    where user_id = p_user_id
    order by created_at asc, id asc
  loop
    v_saldo := v_saldo + r.delta_butir;
    if v_saldo < 0 then
      raise exception 'Perubahan membuat stok menjadi minus.';
    end if;
    update public.stock_movements
    set saldo_after_butir = v_saldo
    where id = r.id and user_id = p_user_id;
  end loop;
end;
$$;

create or replace function public.update_own_stock_movement(
  p_id uuid,
  p_movement_type text,
  p_qty numeric,
  p_unit text,
  p_note text,
  p_delta_butir numeric
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Sesi login tidak ditemukan.';
  end if;

  update public.stock_movements
  set movement_type = p_movement_type,
      qty = p_qty,
      unit = p_unit,
      note = p_note,
      delta_butir = p_delta_butir
  where id = p_id and user_id = auth.uid();

  if not found then
    raise exception 'Data stok tidak ditemukan atau bukan milik akun ini.';
  end if;

  perform public.recalc_stock_saldo(auth.uid());
  return true;
end;
$$;

grant execute on function public.update_own_stock_movement(uuid,text,numeric,text,text,numeric) to authenticated;

grant execute on function public.recalc_stock_saldo(uuid) to authenticated;

create or replace function public.delete_own_stock_movement(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Sesi login tidak ditemukan.';
  end if;

  delete from public.stock_movements
  where id = p_id and user_id = auth.uid();

  if not found then
    raise exception 'Data stok tidak ditemukan atau bukan milik akun ini.';
  end if;

  perform public.recalc_stock_saldo(auth.uid());
  return true;
end;
$$;

grant execute on function public.delete_own_stock_movement(uuid) to authenticated;

notify pgrst, 'reload schema';
