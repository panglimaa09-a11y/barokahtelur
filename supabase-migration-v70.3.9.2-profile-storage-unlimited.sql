-- BAROKAH TELUR V70.3.9.2 - Profile logo storage size
-- Removes the bucket-level file size limit for profile-assets.
-- The application also no longer enforces a logo size limit.
-- Run this once in Supabase SQL Editor.

update storage.buckets
set file_size_limit = null
where id = 'profile-assets';
