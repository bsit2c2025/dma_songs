-- ===========================================================================
-- 0010 — super administrators, member approval, events and attendance
--
-- Safe to run more than once.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. Super administrators
--
-- Held in their own table rather than as a new value on the app_role enum,
-- for two reasons. Postgres will not let a newly added enum value be used in
-- the same transaction that added it, which makes a single-script migration
-- awkward; and more importantly a separate table can be given no write policy
-- at all, so the role is unreachable from the API by anybody, including a
-- super administrator. The only way in or out is the SQL editor.
-- ---------------------------------------------------------------------------
create table if not exists public.super_admins (
  user_id    uuid primary key references public.profiles (id) on delete cascade,
  note       text,
  created_at timestamptz not null default now()
);

alter table public.super_admins enable row level security;

drop policy if exists "signed in users can see who is a super admin" on public.super_admins;
create policy "signed in users can see who is a super admin"
  on public.super_admins for select to authenticated using (true);

-- No insert, update or delete policy exists, on purpose.
grant select on public.super_admins to authenticated;
revoke insert, update, delete on public.super_admins from anon, authenticated;

create or replace function public.is_superadmin(uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (select 1 from public.super_admins where user_id = uid);
$$;

-- A super administrator is an administrator too, so every existing policy
-- keeps working without being rewritten.
create or replace function public.is_admin(uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1 from public.user_roles where user_id = uid and role = 'admin'
  ) or exists (
    select 1 from public.super_admins where user_id = uid
  );
$$;

-- ---------------------------------------------------------------------------
-- 2. Role guard: a super administrator cannot be demoted by an ordinary one
-- ---------------------------------------------------------------------------
create or replace function public.user_roles_guard()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_target uuid;
begin
  v_target := coalesce(new.user_id, old.user_id);

  if tg_op = 'DELETE' then
    -- Protected: only another super administrator can strip a super
    -- administrator's ordinary admin role, and the table that makes them a
    -- super administrator has no write policy at all, so the rank itself
    -- survives regardless.
    if public.is_superadmin(v_target) and not public.is_superadmin(auth.uid()) then
      raise exception 'That account is protected and cannot be changed from here.'
        using errcode = '42501';
    end if;

    if old.role = 'admin'
       and (select count(*) from public.user_roles where role = 'admin') <= 1
       and not exists (select 1 from public.super_admins) then
      raise exception 'That is the last administrator. Promote somebody else first.';
    end if;

    perform public.write_activity_log(
      'role.revoked', 'user', old.user_id, null::text,
      jsonb_build_object('role', old.role)
    );
    return old;
  end if;

  new.granted_by := auth.uid();

  perform public.write_activity_log(
    'role.granted', 'user', new.user_id, null::text,
    jsonb_build_object('role', new.role)
  );
  return new;
end $$;

drop trigger if exists user_roles_guard on public.user_roles;
create trigger user_roles_guard
  before insert or delete on public.user_roles
  for each row execute function public.user_roles_guard();

-- ---------------------------------------------------------------------------
-- 3. Member approval
--
-- Anybody with a Google account can sign up. Without a gate, "members only"
-- is a speed bump rather than a door, so a new account can sign in and see
-- the public pages but reaches no music until an administrator approves it.
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists approved_at   timestamptz,
  add column if not exists approved_by   uuid references public.profiles (id) on delete set null,
  add column if not exists rejected_at   timestamptz,
  add column if not exists approval_note text;

create index if not exists profiles_pending_idx
  on public.profiles (created_at desc)
  where approved_at is null and rejected_at is null and anonymized_at is null;

-- Anyone already in the system when this runs keeps their access: they were
-- vouched for by being there before the gate existed.
update public.profiles set approved_at = coalesce(approved_at, created_at)
 where anonymized_at is null;

create or replace function public.is_approved_member(uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1 from public.profiles
    where id = uid and is_active and approved_at is not null and anonymized_at is null
  );
$$;

create or replace function public.admin_set_member_approval(
  p_user_id uuid,
  p_approve boolean,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_label text;
begin
  if not public.is_admin() then
    raise exception 'Only administrators can approve members.' using errcode = '42501';
  end if;

  select coalesce(display_name, email) into v_label from public.profiles where id = p_user_id;

  update public.profiles
     set approved_at   = case when p_approve then now() else null end,
         approved_by   = case when p_approve then auth.uid() else null end,
         rejected_at   = case when p_approve then null else now() end,
         approval_note = nullif(btrim(coalesce(p_note, '')), '')
   where id = p_user_id;

  perform public.write_activity_log(
    case when p_approve then 'user.approved' else 'user.rejected' end,
    'user', p_user_id, v_label, '{}'::jsonb
  );
end $$;

revoke all on function public.admin_set_member_approval(uuid, boolean, text) from public, anon;
grant execute on function public.admin_set_member_approval(uuid, boolean, text) to authenticated;

create or replace function public.pending_member_count()
returns integer
language sql
stable
security definer
set search_path = public, auth
as $$
  select case when public.is_admin() then (
    select count(*)::int from public.profiles
    where approved_at is null and rejected_at is null and anonymized_at is null
  ) else 0 end;
$$;

revoke all on function public.pending_member_count() from public, anon;
grant execute on function public.pending_member_count() to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Music is for approved members only
--
-- Replaces the anon-readable policies from 0003. The song list, the junction
-- rows and the videos all move behind the same test, so a signed-out request
-- to the REST API returns nothing rather than the interface simply hiding a
-- link.
-- ---------------------------------------------------------------------------
drop policy if exists "active songs are public" on public.songs;
drop policy if exists "approved members read active songs" on public.songs;
create policy "approved members read active songs"
  on public.songs for select to authenticated
  using ((status = 'active' and public.is_approved_member()) or public.is_admin());

drop policy if exists "song parts follow song visibility" on public.song_voice_classifications;
drop policy if exists "approved members read song parts" on public.song_voice_classifications;
create policy "approved members read song parts"
  on public.song_voice_classifications for select to authenticated
  using (
    exists (
      select 1 from public.songs s
      where s.id = song_id
        and ((s.status = 'active' and public.is_approved_member()) or public.is_admin())
    )
  );

drop policy if exists "song videos follow song visibility" on public.song_videos;
drop policy if exists "approved members read song videos" on public.song_videos;
create policy "approved members read song videos"
  on public.song_videos for select to authenticated
  using (
    exists (
      select 1 from public.songs s
      where s.id = song_id
        and ((s.status = 'active' and public.is_approved_member()) or public.is_admin())
    )
  );

revoke select on public.songs, public.song_voice_classifications, public.song_videos from anon;

-- Voice parts stay readable by everyone: the public page names the sections
-- the choir sings, which is a recruiting detail, not private material.

-- ---------------------------------------------------------------------------
-- 5. Events
--
-- An event is an announcement, not a separate kind of thing. A rehearsal
-- notice and a concert call are the same message to the same people; the only
-- difference is that some of them have a date, a place and a costume, and ask
-- for a reply.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'attendance_status') then
    create type public.attendance_status as enum ('going', 'not_going', 'maybe');
  end if;
end $$;

alter table public.announcements
  add column if not exists is_event        boolean not null default false,
  add column if not exists event_starts_at timestamptz,
  add column if not exists event_ends_at   timestamptz,
  add column if not exists call_time       text,
  add column if not exists venue           text,
  add column if not exists address         text,
  add column if not exists dress_code      text,
  add column if not exists what_to_bring   text,
  add column if not exists collect_rsvp    boolean not null default true;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'announcements_event_has_a_date') then
    alter table public.announcements
      add constraint announcements_event_has_a_date
      check (not is_event or event_starts_at is not null) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'announcements_event_window') then
    alter table public.announcements
      add constraint announcements_event_window
      check (event_ends_at is null or event_starts_at is null or event_ends_at >= event_starts_at)
      not valid;
  end if;
end $$;

create index if not exists announcements_upcoming_idx
  on public.announcements (event_starts_at)
  where is_event and is_published;

create table if not exists public.event_attendance (
  announcement_id uuid not null references public.announcements (id) on delete cascade,
  user_id         uuid not null references public.profiles (id) on delete cascade,
  status          public.attendance_status not null,
  note            text check (note is null or char_length(note) <= 300),
  updated_at      timestamptz not null default now(),
  primary key (announcement_id, user_id)
);

create index if not exists event_attendance_event_idx
  on public.event_attendance (announcement_id, status);

alter table public.event_attendance enable row level security;

-- Everyone signed in sees who is coming. A choir needs to know whether the
-- tenors will be there, and hiding it would only move the question to a group
-- chat where nobody can act on it.
drop policy if exists "members read attendance" on public.event_attendance;
create policy "members read attendance"
  on public.event_attendance for select to authenticated
  using (public.is_approved_member() or public.is_admin());

drop policy if exists "members set their own attendance" on public.event_attendance;
create policy "members set their own attendance"
  on public.event_attendance for insert to authenticated
  with check (user_id = auth.uid() and public.is_approved_member());

drop policy if exists "members update their own attendance" on public.event_attendance;
create policy "members update their own attendance"
  on public.event_attendance for update to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "members withdraw their own attendance" on public.event_attendance;
create policy "members withdraw their own attendance"
  on public.event_attendance for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());

grant select, insert, update, delete on public.event_attendance to authenticated;
revoke all on public.event_attendance from anon;

drop trigger if exists set_updated_at on public.event_attendance;
create trigger set_updated_at
  before update on public.event_attendance
  for each row execute function public.set_updated_at();

-- Counts for one event, without pulling every row to the browser.
create or replace function public.event_attendance_summary(p_announcement_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, auth
as $$
  select jsonb_build_object(
    'going',     count(*) filter (where status = 'going'),
    'not_going', count(*) filter (where status = 'not_going'),
    'maybe',     count(*) filter (where status = 'maybe'),
    'total',     count(*)
  )
  from public.event_attendance
  where announcement_id = p_announcement_id;
$$;

revoke all on function public.event_attendance_summary(uuid) from public;
grant execute on function public.event_attendance_summary(uuid) to anon, authenticated;
