-- ===========================================================================
-- 0011 — deactivation reasons, admin-managed attendance, event guests
--
-- Safe to run more than once.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. Deactivation with a reason
--
-- A member who is switched off should be told, and told why. Being quietly
-- unable to reach the library is worse than a plain sentence explaining what
-- happened and who to ask about it.
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists deactivated_at     timestamptz,
  add column if not exists deactivated_by     uuid references public.profiles (id) on delete set null,
  add column if not exists deactivation_reason text
    check (deactivation_reason is null or char_length(deactivation_reason) <= 500);

create or replace function public.admin_set_member_active(
  p_user_id uuid,
  p_active  boolean,
  p_reason  text default null
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
    raise exception 'Only administrators can change member access.' using errcode = '42501';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'You cannot deactivate your own account.';
  end if;

  -- Protected accounts are only touchable by another super administrator.
  if public.is_superadmin(p_user_id) and not public.is_superadmin(auth.uid()) then
    raise exception 'That account is protected.' using errcode = '42501';
  end if;

  if not p_active and nullif(btrim(coalesce(p_reason, '')), '') is null then
    raise exception 'Give a reason — the member is going to be shown it.';
  end if;

  update public.profiles
     set is_active           = p_active,
         -- Reactivating clears the reason rather than keeping it around to
         -- confuse whoever reads the record next. The activity log keeps the
         -- history.
         deactivated_at      = case when p_active then null else now() end,
         deactivated_by      = case when p_active then null else auth.uid() end,
         deactivation_reason = case when p_active then null else btrim(p_reason) end
   where id = p_user_id;

  select coalesce(display_name, email) into v_label from public.profiles where id = p_user_id;

  perform public.write_activity_log(
    case when p_active then 'user.reactivated' else 'user.deactivated' end,
    'user', p_user_id, v_label,
    jsonb_build_object('reason', nullif(btrim(coalesce(p_reason, '')), ''))
  );
end $$;

revoke all on function public.admin_set_member_active(uuid, boolean, text) from public, anon;
grant execute on function public.admin_set_member_active(uuid, boolean, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. RSVP deadline
-- ---------------------------------------------------------------------------
alter table public.announcements
  add column if not exists rsvp_deadline timestamptz;

-- ---------------------------------------------------------------------------
-- 3. Attendance an administrator can manage
--
-- Some replies never arrive through the app: somebody says "I'll be there" at
-- rehearsal, or texts the section leader. The administrator records that, and
-- the row remembers it was set on their behalf so the two are never confused
-- when the list is read back.
-- ---------------------------------------------------------------------------
alter table public.event_attendance
  add column if not exists set_by_admin boolean not null default false,
  add column if not exists set_by       uuid references public.profiles (id) on delete set null,
  add column if not exists admin_note   text
    check (admin_note is null or char_length(admin_note) <= 300);

-- An administrator's entry is the record of record. A member cannot overwrite
-- it, because the whole reason it exists is that the administrator was told
-- something outside the app.
create or replace function public.event_attendance_guard()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if tg_op = 'UPDATE'
     and old.set_by_admin
     and not public.is_admin() then
    raise exception
      'An administrator set your reply for this event. Ask them if it needs changing.'
      using errcode = '42501';
  end if;

  if public.is_admin() and auth.uid() is distinct from new.user_id then
    new.set_by_admin := true;
    new.set_by       := auth.uid();
  elsif tg_op = 'INSERT' then
    new.set_by_admin := false;
    new.set_by       := auth.uid();
  end if;

  return new;
end $$;

drop trigger if exists event_attendance_guard on public.event_attendance;
create trigger event_attendance_guard
  before insert or update on public.event_attendance
  for each row execute function public.event_attendance_guard();

-- Enforce the deadline in the database, so it holds for a request that skips
-- the interface. Administrators are exempt: that is the point of a deadline
-- somebody administers.
create or replace function public.set_my_attendance(
  p_announcement_id uuid,
  p_status public.attendance_status,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_deadline timestamptz;
begin
  if not public.is_approved_member() then
    raise exception 'Only approved members can reply to events.' using errcode = '42501';
  end if;

  select rsvp_deadline into v_deadline
  from public.announcements where id = p_announcement_id;

  if v_deadline is not null and now() > v_deadline and not public.is_admin() then
    raise exception 'Replies for this event closed on %.',
      to_char(v_deadline, 'DD Mon YYYY at HH12:MI AM');
  end if;

  insert into public.event_attendance (announcement_id, user_id, status, note)
  values (p_announcement_id, auth.uid(), p_status, nullif(btrim(coalesce(p_note, '')), ''))
  on conflict (announcement_id, user_id) do update
    set status = excluded.status,
        note   = excluded.note;
end $$;

revoke all on function public.set_my_attendance(uuid, public.attendance_status, text) from public, anon;
grant execute on function public.set_my_attendance(uuid, public.attendance_status, text) to authenticated;

create or replace function public.admin_set_attendance(
  p_announcement_id uuid,
  p_user_id uuid,
  p_status public.attendance_status,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_admin() then
    raise exception 'Only administrators can set somebody else''s reply.' using errcode = '42501';
  end if;

  insert into public.event_attendance
    (announcement_id, user_id, status, admin_note, set_by_admin, set_by)
  values
    (p_announcement_id, p_user_id, p_status,
     nullif(btrim(coalesce(p_note, '')), ''), true, auth.uid())
  on conflict (announcement_id, user_id) do update
    set status       = excluded.status,
        admin_note   = excluded.admin_note,
        set_by_admin = true,
        set_by       = auth.uid();

  perform public.write_activity_log(
    'event.attendance_set', 'announcement', p_announcement_id, null::text,
    jsonb_build_object('user_id', p_user_id, 'status', p_status)
  );
end $$;

revoke all on function public.admin_set_attendance(uuid, uuid, public.attendance_status, text) from public, anon;
grant execute on function public.admin_set_attendance(uuid, uuid, public.attendance_status, text) to authenticated;

-- Hand an entry back to the member.
create or replace function public.admin_clear_attendance(
  p_announcement_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_admin() then
    raise exception 'Only administrators can clear a reply.' using errcode = '42501';
  end if;

  delete from public.event_attendance
   where announcement_id = p_announcement_id and user_id = p_user_id;
end $$;

revoke all on function public.admin_clear_attendance(uuid, uuid) from public, anon;
grant execute on function public.admin_clear_attendance(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Who hasn't replied
--
-- The useful list. "Twelve going" tells you nothing; "these nine never
-- answered" is something you can act on before Friday.
-- ---------------------------------------------------------------------------
create or replace function public.event_non_responders(p_announcement_id uuid)
returns table (
  id uuid,
  display_name text,
  email text,
  avatar_url text,
  voice_classification_id uuid
)
language sql
stable
security definer
set search_path = public, auth
as $$
  select p.id, p.display_name, p.email, p.avatar_url, p.voice_classification_id
  from public.profiles p
  where public.is_admin()
    and p.is_active
    and p.approved_at is not null
    and p.anonymized_at is null
    and not exists (
      select 1 from public.event_attendance a
      where a.announcement_id = p_announcement_id and a.user_id = p.id
    )
  order by p.display_name;
$$;

revoke all on function public.event_non_responders(uuid) from public, anon;
grant execute on function public.event_non_responders(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Guest singers and alumni
--
-- People who sing with the choir for one concert but have no account, and
-- should not need one just to appear on a call sheet.
-- ---------------------------------------------------------------------------
create table if not exists public.event_guests (
  id              uuid primary key default gen_random_uuid(),
  announcement_id uuid not null references public.announcements (id) on delete cascade,
  name            text not null check (char_length(btrim(name)) between 1 and 160),
  role            text check (role is null or char_length(role) <= 120),
  voice_classification_id uuid references public.voice_classifications (id) on delete set null,
  status          public.attendance_status not null default 'going',
  note            text check (note is null or char_length(note) <= 300),
  added_by        uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists event_guests_event_idx on public.event_guests (announcement_id);

alter table public.event_guests enable row level security;

drop policy if exists "members read event guests" on public.event_guests;
create policy "members read event guests"
  on public.event_guests for select to authenticated
  using (public.is_approved_member() or public.is_admin());

drop policy if exists "admins add event guests" on public.event_guests;
create policy "admins add event guests"
  on public.event_guests for insert to authenticated with check (public.is_admin());

drop policy if exists "admins update event guests" on public.event_guests;
create policy "admins update event guests"
  on public.event_guests for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admins remove event guests" on public.event_guests;
create policy "admins remove event guests"
  on public.event_guests for delete to authenticated using (public.is_admin());

grant select, insert, update, delete on public.event_guests to authenticated;
revoke all on public.event_guests from anon;

drop trigger if exists set_updated_at on public.event_guests;
create trigger set_updated_at
  before update on public.event_guests
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 6. Event list for the admin page, with counts, in one query
-- ---------------------------------------------------------------------------
create or replace function public.admin_event_list(p_include_past boolean default false)
returns jsonb
language sql
stable
security definer
set search_path = public, auth
as $$
  select case when not public.is_admin() then '[]'::jsonb else coalesce(
    (
      select jsonb_agg(row_to_json(e) order by e.event_starts_at asc)
      from (
        select
          a.id,
          a.title,
          a.event_starts_at,
          a.event_ends_at,
          a.venue,
          a.dress_code,
          a.is_published,
          a.collect_rsvp,
          a.rsvp_deadline,
          (select count(*) from public.event_attendance x
            where x.announcement_id = a.id and x.status = 'going')     as going,
          (select count(*) from public.event_attendance x
            where x.announcement_id = a.id and x.status = 'maybe')     as maybe,
          (select count(*) from public.event_attendance x
            where x.announcement_id = a.id and x.status = 'not_going') as not_going,
          (select count(*) from public.event_guests g
            where g.announcement_id = a.id)                            as guests,
          (
            select count(*) from public.profiles p
            where p.is_active and p.approved_at is not null and p.anonymized_at is null
              and not exists (
                select 1 from public.event_attendance x
                where x.announcement_id = a.id and x.user_id = p.id
              )
          )                                                            as no_reply
        from public.announcements a
        where a.is_event
          and (p_include_past or a.event_starts_at >= now() - interval '1 day')
      ) e
    ), '[]'::jsonb) end;
$$;

revoke all on function public.admin_event_list(boolean) from public, anon;
grant execute on function public.admin_event_list(boolean) to authenticated;
