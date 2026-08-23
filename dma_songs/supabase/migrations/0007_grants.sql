-- ===========================================================================
-- 0007 — table privileges for the API roles.
--
-- WHY THIS EXISTS
--   Postgres checks two things before a row is returned: the GRANT on the
--   table, and then the RLS policy on the row. Migration 0003 wrote the
--   policies but relied on Supabase's default privileges to supply the
--   grants. Those defaults are attached to the role that owns the schema and
--   do not always reach tables created from the SQL Editor, which leaves the
--   tables with policies that never get consulted, because `anon` and
--   `authenticated` cannot open the table in the first place.
--
--   The symptom is silent and confusing: every query succeeds and returns
--   zero rows. The song list looks empty, and a role lookup returns nothing,
--   so a real administrator is told they are not one.
--
--   A migration should not depend on ambient defaults. These grants are
--   explicit.
--
-- SECURITY NOTE
--   Granting INSERT on `songs` to `authenticated` does not let a singer
--   insert a song. Table grants are deliberately coarse; the RLS policies
--   from 0003 are what actually decide, and they require is_admin(). This is
--   the standard Supabase model: broad privilege, narrow policy.
--
--   Safe to run more than once.
-- ===========================================================================

grant usage on schema public to anon, authenticated;

-- Reference data ------------------------------------------------------------
-- Readable by everyone; the picker has to work for guests.
grant select                         on public.voice_classifications to anon, authenticated;
grant insert, update, delete         on public.voice_classifications to authenticated;

-- Songs and everything hanging off them -------------------------------------
-- Guests browse the library, so anon needs SELECT. Policies still hide any
-- song whose status is 'disabled'.
grant select                         on public.songs                      to anon, authenticated;
grant insert, update, delete         on public.songs                      to authenticated;

grant select                         on public.song_voice_classifications to anon, authenticated;
grant insert, update, delete         on public.song_voice_classifications to authenticated;

grant select                         on public.song_videos                to anon, authenticated;
grant insert, update, delete         on public.song_videos                to authenticated;

-- Announcements -------------------------------------------------------------
-- Policies restrict anon to published rows inside their date window.
grant select                         on public.announcements to anon, authenticated;
grant insert, update, delete         on public.announcements to authenticated;

-- Profiles ------------------------------------------------------------------
-- No anon access at all: a guest has no business reading the member list.
-- No INSERT for anyone — rows are created by handle_new_user(), which is
-- SECURITY DEFINER and needs no grant. No DELETE: accounts are deactivated,
-- and removing one is an auth-level operation.
grant select, update                 on public.profiles to authenticated;

-- Roles ---------------------------------------------------------------------
-- SELECT so a signed-in user can discover their own roles — without this the
-- app cannot tell an administrator from a singer. INSERT and DELETE are
-- gated to admins by policy. UPDATE is granted to nobody, matching the
-- deliberate absence of an UPDATE policy: a role is granted or revoked,
-- never edited in place.
grant select, insert, delete         on public.user_roles to authenticated;

-- Settings ------------------------------------------------------------------
-- anon reads the public rows (app name, logo) to render the header.
grant select                         on public.app_settings to anon, authenticated;
grant insert, update, delete         on public.app_settings to authenticated;

-- Activity log --------------------------------------------------------------
-- Admin-readable, and append-only from the outside. Writes happen only in
-- write_activity_log(), which is SECURITY DEFINER and revoked from clients.
grant select                         on public.activity_logs to authenticated;
revoke insert, update, delete        on public.activity_logs from anon, authenticated;

-- Anything added to this schema later gets the same treatment, so a future
-- table does not repeat this bug.
alter default privileges in schema public
  grant select on tables to anon, authenticated;
alter default privileges in schema public
  grant insert, update, delete on tables to authenticated;

-- ===========================================================================
-- Verify. Every table below should list SELECT for both roles, except
-- profiles, user_roles and activity_logs, which are authenticated-only.
-- ===========================================================================
select
  table_name,
  grantee,
  string_agg(privilege_type, ', ' order by privilege_type) as privileges
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee in ('anon', 'authenticated')
  and table_name in (
    'voice_classifications','profiles','user_roles','songs',
    'song_voice_classifications','song_videos','announcements',
    'activity_logs','app_settings'
  )
group by table_name, grantee
order by table_name, grantee;
