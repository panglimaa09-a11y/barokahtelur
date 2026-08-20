-- BAROKAH TELUR V70.5.3
-- Reliable owner-scoped stock edit/delete RPC.
-- Run once in Supabase SQL Editor.

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
  where id = p_id
    and user_id = auth.uid();

  if not found then
    raise exception 'Data stok tidak ditemukan atau bukan milik akun ini.';
  end if;

  return true;
end;
$$;

grant execute on function public.update_own_stock_movement(uuid,text,numeric,text,text,numeric) to authenticated;

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
  where id = p_id
    and user_id = auth.uid();

  if not found then
    raise exception 'Data stok tidak ditemukan atau bukan milik akun ini.';
  end if;

  return true;
end;
$$;

grant execute on function public.delete_own_stock_movement(uuid) to authenticated;

notify pgrst, 'reload schema';
