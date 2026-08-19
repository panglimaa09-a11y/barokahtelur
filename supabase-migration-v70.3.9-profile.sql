-- BAROKAH TELUR V70.3.9 - Profile Management
-- Adds editable business/user profile data without changing transactions.

alter table public.profiles
  add column if not exists business_name text,
  add column if not exists business_address text,
  add column if not exists phone text,
  add column if not exists logo_url text;

create index if not exists profiles_business_name_idx
  on public.profiles(business_name);

comment on column public.profiles.business_name is 'Nama usaha yang ditampilkan di aplikasi dan nota';
comment on column public.profiles.business_address is 'Alamat usaha';
comment on column public.profiles.phone is 'Nomor WhatsApp/telepon usaha';
comment on column public.profiles.logo_url is 'URL logo usaha';
