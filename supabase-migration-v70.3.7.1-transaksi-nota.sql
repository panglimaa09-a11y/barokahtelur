-- BAROKAH TELUR V70.3.7.1
-- Automatic transaction number for Utang Piutang + safe printable nota support.
-- Does not delete or alter existing transaction/stok data.

create sequence if not exists public.debt_transaction_no_seq
  as bigint start with 1 increment by 1 minvalue 1 no cycle cache 1;

create or replace function public.set_debt_transaction_no()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  n bigint;
  prefix text;
begin
  if coalesce(btrim(new.reference_no),'') = '' then
    n := nextval('public.debt_transaction_no_seq');
    prefix := case when new.kind = 'utang' then 'UTG' else 'PIU' end;
    new.reference_no := prefix || '-' || to_char(coalesce(new.debt_date,current_date),'YYYYMMDD') || '-' || lpad(n::text,6,'0');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_debt_transaction_no on public.debts_receivables;
create trigger trg_set_debt_transaction_no
before insert on public.debts_receivables
for each row
execute function public.set_debt_transaction_no();

create unique index if not exists debts_receivables_user_reference_unique
  on public.debts_receivables(user_id, reference_no)
  where reference_no is not null and btrim(reference_no) <> '';

-- Backfill only blank reference numbers; existing numbers are preserved.
update public.debts_receivables d
set reference_no = case when d.kind='utang' then 'UTG' else 'PIU' end
  || '-' || to_char(coalesce(d.debt_date,current_date),'YYYYMMDD')
  || '-' || lpad(nextval('public.debt_transaction_no_seq')::text,6,'0')
where coalesce(btrim(d.reference_no),'')='';
