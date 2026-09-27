-- Barokah Telur: register the second login UID as a shared business admin.
-- This does NOT move, delete, or overwrite existing data.
-- It only allows this authenticated account to see/manage the same shared
-- business records as the existing admin account.
--
-- Run once in Supabase SQL Editor.

insert into public.admin_users (user_id, email)
select id, lower(email)
from auth.users
where id = 'e62dd6fe-39fc-43a5-b13c-5ab82207345b'
on conflict (user_id) do update
set email = excluded.email;

-- Verify registration:
select user_id, email
from public.admin_users
where user_id = 'e62dd6fe-39fc-43a5-b13c-5ab82207345b';
