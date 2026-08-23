-- ===========================================================================
-- dma_songs — 0003 Row Level Security
--
-- Model
--   anon           guests: read active songs, their parts/videos, live
--                  announcements and public settings. No writes anywhere.
--   authenticated  the above, plus their own profile row and their own roles.
--   admin          full CRUD, decided by public.is_admin() which reads the
--                  user_roles table — never by anything the client sends.
--
-- There is no `using (true)` on any write policy in this file.
-- ===========================================================================

alter table public.voice_classifications      enable row level security;
alter table public.profiles                   enable row level security;
alter table public.user_roles                 enable row level security;
alter table public.songs                      enable row level security;
alter table public.song_voice_classifications enable row level security;
alter table public.song_videos                enable row level security;
alter table public.announcements              enable row level security;
alter table public.activity_logs              enable row level security;
alter table public.app_settings               enable row level security;

-- ---------------------------------------------------------------------------
-- voice_classifications — world readable (a guest must be able to pick a part)
-- ---------------------------------------------------------------------------
drop policy if exists "voice parts are readable by everyone" on public.voice_classifications;
create policy "voice parts are readable by everyone"
  on public.voice_classifications for select
  to anon, authenticated using (true);

drop policy if exists "admins manage voice parts" on public.voice_classifications;
create policy "admins manage voice parts"
  on public.voice_classifications for all
  to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
drop policy if exists "read own profile or any profile as admin" on public.profiles;
create policy "read own profile or any profile as admin"
  on public.profiles for select
  to authenticated using (id = auth.uid() or public.is_admin());

drop policy if exists "insert own profile" on public.profiles;
create policy "insert own profile"
  on public.profiles for insert
  to authenticated with check (id = auth.uid() or public.is_admin());

-- Column-level protection (email / is_active / id) is enforced by the
-- public.profiles_guard() trigger; RLS decides row access only.
drop policy if exists "update own profile or any profile as admin" on public.profiles;
create policy "update own profile or any profile as admin"
  on public.profiles for update
  to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

drop policy if exists "admins delete profiles" on public.profiles;
create policy "admins delete profiles"
  on public.profiles for delete
  to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------------
-- user_roles — the privilege escalation surface. Read your own, write nothing.
-- ---------------------------------------------------------------------------
drop policy if exists "read own roles or all as admin" on public.user_roles;
create policy "read own roles or all as admin"
  on public.user_roles for select
  to authenticated using (user_id = auth.uid() or public.is_admin());

drop policy if exists "admins grant roles" on public.user_roles;
create policy "admins grant roles"
  on public.user_roles for insert
  to authenticated with check (public.is_admin());

drop policy if exists "admins revoke roles" on public.user_roles;
create policy "admins revoke roles"
  on public.user_roles for delete
  to authenticated using (public.is_admin());
-- No UPDATE policy: a role assignment is granted or revoked, never edited.

-- ---------------------------------------------------------------------------
-- songs
-- ---------------------------------------------------------------------------
drop policy if exists "active songs are public" on public.songs;
create policy "active songs are public"
  on public.songs for select
  to anon, authenticated using (status = 'active' or public.is_admin());

drop policy if exists "admins insert songs" on public.songs;
create policy "admins insert songs"
  on public.songs for insert to authenticated with check (public.is_admin());

drop policy if exists "admins update songs" on public.songs;
create policy "admins update songs"
  on public.songs for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admins delete songs" on public.songs;
create policy "admins delete songs"
  on public.songs for delete to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------------
-- song_voice_classifications — visible when the parent song is visible
-- ---------------------------------------------------------------------------
drop policy if exists "song parts follow song visibility" on public.song_voice_classifications;
create policy "song parts follow song visibility"
  on public.song_voice_classifications for select
  to anon, authenticated
  using (exists (
    select 1 from public.songs s
    where s.id = song_id and (s.status = 'active' or public.is_admin())
  ));

drop policy if exists "admins manage song parts" on public.song_voice_classifications;
create policy "admins manage song parts"
  on public.song_voice_classifications for all
  to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- song_videos
-- ---------------------------------------------------------------------------
drop policy if exists "song videos follow song visibility" on public.song_videos;
create policy "song videos follow song visibility"
  on public.song_videos for select
  to anon, authenticated
  using (exists (
    select 1 from public.songs s
    where s.id = song_id and (s.status = 'active' or public.is_admin())
  ));

drop policy if exists "admins manage song videos" on public.song_videos;
create policy "admins manage song videos"
  on public.song_videos for all
  to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- announcements — published AND inside the schedule window
-- ---------------------------------------------------------------------------
drop policy if exists "live announcements are public" on public.announcements;
create policy "live announcements are public"
  on public.announcements for select
  to anon, authenticated
  using (
    public.is_admin()
    or (
      is_published
      and (starts_at is null or starts_at <= now())
      and (ends_at is null or ends_at >= now())
    )
  );

drop policy if exists "admins insert announcements" on public.announcements;
create policy "admins insert announcements"
  on public.announcements for insert to authenticated with check (public.is_admin());

drop policy if exists "admins update announcements" on public.announcements;
create policy "admins update announcements"
  on public.announcements for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admins delete announcements" on public.announcements;
create policy "admins delete announcements"
  on public.announcements for delete to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------------
-- activity_logs — read-only for admins, append-only from SECURITY DEFINER
-- functions. Deliberately no insert/update/delete policy exists.
-- ---------------------------------------------------------------------------
drop policy if exists "admins read activity" on public.activity_logs;
create policy "admins read activity"
  on public.activity_logs for select to authenticated using (public.is_admin());

revoke insert, update, delete on public.activity_logs from anon, authenticated;

-- ---------------------------------------------------------------------------
-- app_settings
-- ---------------------------------------------------------------------------
drop policy if exists "public settings are readable" on public.app_settings;
create policy "public settings are readable"
  on public.app_settings for select
  to anon, authenticated using (is_public or public.is_admin());

drop policy if exists "admins manage settings" on public.app_settings;
create policy "admins manage settings"
  on public.app_settings for all
  to authenticated using (public.is_admin()) with check (public.is_admin());
