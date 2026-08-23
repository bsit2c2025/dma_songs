-- ===========================================================================
-- dma_songs — 0004 storage buckets and policies
--
-- Three public-read buckets (their contents are meant to be shown to guests)
-- and write access limited to admins, except avatars where a member owns the
-- folder named after their user id.
-- ===========================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('announcement-images', 'announcement-images', true, 5242880,
   array['image/png','image/jpeg','image/webp','image/gif']),
  ('song-thumbnails', 'song-thumbnails', true, 5242880,
   array['image/png','image/jpeg','image/webp']),
  ('branding', 'branding', true, 2097152,
   array['image/png','image/jpeg','image/webp','image/svg+xml']),
  ('avatars', 'avatars', true, 2097152,
   array['image/png','image/jpeg','image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public read of shared image buckets" on storage.objects;
create policy "public read of shared image buckets"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id in ('announcement-images', 'song-thumbnails', 'branding', 'avatars'));

drop policy if exists "admins write shared image buckets" on storage.objects;
create policy "admins write shared image buckets"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id in ('announcement-images', 'song-thumbnails', 'branding')
    and public.is_admin()
  );

drop policy if exists "admins update shared image buckets" on storage.objects;
create policy "admins update shared image buckets"
  on storage.objects for update
  to authenticated
  using (bucket_id in ('announcement-images', 'song-thumbnails', 'branding') and public.is_admin())
  with check (bucket_id in ('announcement-images', 'song-thumbnails', 'branding') and public.is_admin());

drop policy if exists "admins delete shared image buckets" on storage.objects;
create policy "admins delete shared image buckets"
  on storage.objects for delete
  to authenticated
  using (bucket_id in ('announcement-images', 'song-thumbnails', 'branding') and public.is_admin());

-- Members own the folder that matches their user id: avatars/<uid>/file.png
drop policy if exists "members manage their own avatar" on storage.objects;
create policy "members manage their own avatar"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "members update their own avatar" on storage.objects;
create policy "members update their own avatar"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "members delete their own avatar" on storage.objects;
create policy "members delete their own avatar"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
