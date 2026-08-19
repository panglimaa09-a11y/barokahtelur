-- BAROKAH TELUR V70.3.9.1 - Profile Logo Storage
-- Run once in Supabase SQL Editor after V70.3.9 profile migration.
-- Does not alter transaction, stock, debt/receivable, or operational tables.

insert into storage.buckets (id, name, public)
values ('profile-assets', 'profile-assets', true)
on conflict (id) do update set public = true;

-- Recreate only the policies for this dedicated profile-assets bucket.
drop policy if exists "profile-assets public read" on storage.objects;
drop policy if exists "profile-assets authenticated upload" on storage.objects;
drop policy if exists "profile-assets authenticated update" on storage.objects;
drop policy if exists "profile-assets authenticated delete" on storage.objects;

create policy "profile-assets public read"
on storage.objects for select
to public
using (bucket_id = 'profile-assets');

create policy "profile-assets authenticated upload"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'profile-assets'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "profile-assets authenticated update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'profile-assets'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'profile-assets'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "profile-assets authenticated delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'profile-assets'
  and (storage.foldername(name))[1] = auth.uid()::text
);
