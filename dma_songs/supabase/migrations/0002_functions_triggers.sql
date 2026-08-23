-- ===========================================================================
-- dma_songs — 0002 functions, triggers and audit logging
--
-- Everything here is SECURITY DEFINER with a pinned search_path. These
-- functions are the only way privileged rows (activity_logs, profiles on
-- signup) get written, which keeps the RLS policies in 0003 free of
-- "insert using (true)" style holes.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Authorization helper. SECURITY DEFINER so it can read user_roles without
-- being subject to that table's own RLS (which would recurse).
-- ---------------------------------------------------------------------------
create or replace function public.is_admin(uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1 from public.user_roles r
    where r.user_id = uid and r.role = 'admin'
  );
$$;
revoke all on function public.is_admin(uuid) from public;
grant execute on function public.is_admin(uuid) to anon, authenticated;

create or replace function public.current_roles()
returns public.app_role[]
language sql
stable
security definer
set search_path = public, auth
as $$
  select coalesce(array_agg(r.role), '{}'::public.app_role[])
  from public.user_roles r where r.user_id = auth.uid();
$$;
grant execute on function public.current_roles() to authenticated;

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- slug helper for voice classifications
-- ---------------------------------------------------------------------------
create or replace function public.slugify(value text)
returns text language sql immutable as $$
  select trim(both '-' from regexp_replace(lower(btrim(value)), '[^a-z0-9]+', '-', 'g'));
$$;

create or replace function public.voice_classifications_before_write()
returns trigger language plpgsql as $$
begin
  if new.slug is null or btrim(new.slug) = '' then
    new.slug := public.slugify(new.name);
  end if;
  if new.short_code is null or btrim(new.short_code) = '' then
    -- "Soprano 1" -> "S1", "Bass 2" -> "B2"
    new.short_code := upper(left(regexp_replace(new.name, '[^A-Za-z]', '', 'g'), 1))
                      || coalesce(substring(new.name from '[0-9]+'), '');
  end if;
  return new;
end $$;

drop trigger if exists voice_classifications_before_write on public.voice_classifications;
create trigger voice_classifications_before_write
  before insert or update on public.voice_classifications
  for each row execute function public.voice_classifications_before_write();

-- ---------------------------------------------------------------------------
-- Audit log writer
-- ---------------------------------------------------------------------------
create or replace function public.write_activity_log(
  p_action text,
  p_resource_type text,
  p_resource_id uuid,
  p_resource_label text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_email text;
begin
  select u.email into v_email from auth.users u where u.id = auth.uid();
  insert into public.activity_logs (actor_id, actor_email, action, resource_type, resource_id, resource_label, metadata)
  values (auth.uid(), v_email, p_action, p_resource_type, p_resource_id, p_resource_label, coalesce(p_metadata, '{}'::jsonb));
end $$;
revoke all on function public.write_activity_log(text, text, uuid, text, jsonb) from public, anon, authenticated;

-- Client-callable wrapper for events that do not change a row (e.g. an admin
-- signing in). Admin-only and restricted to a whitelist of action names so it
-- cannot be used to forge arbitrary audit entries.
create or replace function public.log_admin_event(p_action text, p_metadata jsonb default '{}'::jsonb)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if p_action not in ('auth.admin_signed_in', 'auth.admin_signed_out') then
    raise exception 'unsupported action' using errcode = '22023';
  end if;
  perform public.write_activity_log(p_action, 'auth', auth.uid(), null, coalesce(p_metadata, '{}'::jsonb));
end $$;
grant execute on function public.log_admin_event(text, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- New auth user -> profile + default 'singer' role
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_name text;
begin
  v_name := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
    split_part(coalesce(new.email, 'singer'), '@', 1)
  );

  insert into public.profiles (id, display_name, email, avatar_url)
  values (
    new.id,
    left(v_name, 120),
    new.email,
    nullif(btrim(coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')), '')
  )
  on conflict (id) do update
    set email = excluded.email,
        avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url);

  -- Every account starts as a singer. Admin is granted out of band; there is
  -- deliberately no code path that lets signup produce an admin.
  insert into public.user_roles (user_id, role)
  values (new.id, 'singer')
  on conflict do nothing;

  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep profile email in sync when the user changes it in auth.
create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles set email = new.email, updated_at = now() where id = new.id;
  end if;
  return new;
end $$;

drop trigger if exists on_auth_user_email_change on auth.users;
create trigger on_auth_user_email_change
  after update of email on auth.users
  for each row execute function public.handle_user_email_change();

-- ---------------------------------------------------------------------------
-- Profile guard: a singer may edit their own display name, avatar and voice
-- part. Everything else is frozen unless an admin is doing the update.
-- ---------------------------------------------------------------------------
create or replace function public.profiles_guard()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_admin() then
    new.id         := old.id;
    new.email      := old.email;
    new.is_active  := old.is_active;
    new.created_at := old.created_at;
  end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard
  before update on public.profiles
  for each row execute function public.profiles_guard();

-- ---------------------------------------------------------------------------
-- Role guard: never allow the last admin to be removed, and stamp granted_by.
-- ---------------------------------------------------------------------------
create or replace function public.user_roles_guard()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_admin_count integer;
begin
  if tg_op = 'INSERT' then
    new.granted_by := coalesce(new.granted_by, auth.uid());
    perform public.write_activity_log('role.granted', 'user', new.user_id, null,
      jsonb_build_object('role', new.role));
    return new;
  end if;

  if tg_op = 'DELETE' and old.role = 'admin' then
    select count(*) into v_admin_count from public.user_roles where role = 'admin';
    if v_admin_count <= 1 then
      raise exception 'The last administrator cannot be removed.' using errcode = '23514';
    end if;
    perform public.write_activity_log('role.revoked', 'user', old.user_id, null,
      jsonb_build_object('role', old.role));
  end if;
  return old;
end $$;

drop trigger if exists user_roles_guard on public.user_roles;
create trigger user_roles_guard
  before insert or delete on public.user_roles
  for each row execute function public.user_roles_guard();

-- ---------------------------------------------------------------------------
-- Referential guard: a voice classification in use cannot be deleted.
-- (ON DELETE RESTRICT already covers songs/videos; profiles use SET NULL, so
-- we check those explicitly and fail loudly instead of silently unassigning.)
-- ---------------------------------------------------------------------------
create or replace function public.voice_classifications_before_delete()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_profiles integer;
  v_songs integer;
begin
  select count(*) into v_profiles from public.profiles where voice_classification_id = old.id;
  select count(*) into v_songs from public.song_voice_classifications where voice_classification_id = old.id;
  if v_profiles > 0 or v_songs > 0 then
    raise exception
      'Voice part "%" is still in use by % song(s) and % member(s). Reassign them first, or set the part to inactive instead.',
      old.name, v_songs, v_profiles
      using errcode = '23503';
  end if;
  return old;
end $$;

drop trigger if exists voice_classifications_before_delete on public.voice_classifications;
create trigger voice_classifications_before_delete
  before delete on public.voice_classifications
  for each row execute function public.voice_classifications_before_delete();

-- ---------------------------------------------------------------------------
-- Stamp created_by / updated_by from the session; the client never sends them.
-- ---------------------------------------------------------------------------
create or replace function public.stamp_authorship()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
    new.updated_by := auth.uid();
  else
    new.created_by := old.created_by;
    new.updated_by := auth.uid();
    new.created_at := old.created_at;
  end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists songs_stamp_authorship on public.songs;
create trigger songs_stamp_authorship
  before insert or update on public.songs
  for each row execute function public.stamp_authorship();

drop trigger if exists announcements_stamp_authorship on public.announcements;
create trigger announcements_stamp_authorship
  before insert or update on public.announcements
  for each row execute function public.stamp_authorship();

drop trigger if exists song_videos_set_updated_at on public.song_videos;
create trigger song_videos_set_updated_at
  before update on public.song_videos
  for each row execute function public.set_updated_at();

drop trigger if exists voice_classifications_set_updated_at on public.voice_classifications;
create trigger voice_classifications_set_updated_at
  before update on public.voice_classifications
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Audit triggers. Logging happens in the database, so an administrative change
-- cannot be made "off the record" by talking to the REST API directly.
-- ---------------------------------------------------------------------------
create or replace function public.audit_songs()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if tg_op = 'INSERT' then
    perform public.write_activity_log('song.created', 'song', new.id, new.title,
      jsonb_build_object('status', new.status));
    return new;
  elsif tg_op = 'UPDATE' then
    if new.status is distinct from old.status then
      perform public.write_activity_log(
        case when new.status = 'active' then 'song.enabled' else 'song.disabled' end,
        'song', new.id, new.title, jsonb_build_object('from', old.status, 'to', new.status));
    else
      perform public.write_activity_log('song.updated', 'song', new.id, new.title, '{}'::jsonb);
    end if;
    return new;
  else
    perform public.write_activity_log('song.deleted', 'song', old.id, old.title, '{}'::jsonb);
    return old;
  end if;
end $$;

drop trigger if exists audit_songs on public.songs;
create trigger audit_songs
  after insert or update or delete on public.songs
  for each row execute function public.audit_songs();

create or replace function public.audit_announcements()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if tg_op = 'INSERT' then
    perform public.write_activity_log('announcement.created', 'announcement', new.id, new.title,
      jsonb_build_object('published', new.is_published));
    return new;
  elsif tg_op = 'UPDATE' then
    if new.is_published is distinct from old.is_published then
      perform public.write_activity_log(
        case when new.is_published then 'announcement.published' else 'announcement.unpublished' end,
        'announcement', new.id, new.title, '{}'::jsonb);
    else
      perform public.write_activity_log('announcement.updated', 'announcement', new.id, new.title, '{}'::jsonb);
    end if;
    return new;
  else
    perform public.write_activity_log('announcement.deleted', 'announcement', old.id, old.title, '{}'::jsonb);
    return old;
  end if;
end $$;

drop trigger if exists audit_announcements on public.announcements;
create trigger audit_announcements
  after insert or update or delete on public.announcements
  for each row execute function public.audit_announcements();

create or replace function public.audit_profiles()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if new.voice_classification_id is distinct from old.voice_classification_id then
    perform public.write_activity_log(
      case when auth.uid() = new.id then 'profile.voice_changed' else 'user.voice_changed' end,
      'user', new.id, nullif(new.display_name, ''),
      jsonb_build_object('from', old.voice_classification_id, 'to', new.voice_classification_id));
  end if;
  if new.is_active is distinct from old.is_active then
    perform public.write_activity_log(
      case when new.is_active then 'user.reactivated' else 'user.deactivated' end,
      'user', new.id, nullif(new.display_name, ''), '{}'::jsonb);
  end if;
  return new;
end $$;

drop trigger if exists audit_profiles on public.profiles;
create trigger audit_profiles
  after update on public.profiles
  for each row execute function public.audit_profiles();

create or replace function public.audit_voice_classifications()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if tg_op = 'INSERT' then
    perform public.write_activity_log('voice_part.created', 'voice_classification', new.id, new.name, '{}'::jsonb);
    return new;
  elsif tg_op = 'UPDATE' then
    perform public.write_activity_log('voice_part.updated', 'voice_classification', new.id, new.name, '{}'::jsonb);
    return new;
  else
    perform public.write_activity_log('voice_part.deleted', 'voice_classification', old.id, old.name, '{}'::jsonb);
    return old;
  end if;
end $$;

drop trigger if exists audit_voice_classifications on public.voice_classifications;
create trigger audit_voice_classifications
  after insert or update or delete on public.voice_classifications
  for each row execute function public.audit_voice_classifications();

create or replace function public.audit_settings()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  new.updated_by := auth.uid();
  new.updated_at := now();
  perform public.write_activity_log('settings.updated', 'setting', null, new.key,
    jsonb_build_object('key', new.key));
  return new;
end $$;

drop trigger if exists audit_settings on public.app_settings;
create trigger audit_settings
  before insert or update on public.app_settings
  for each row execute function public.audit_settings();

-- ---------------------------------------------------------------------------
-- Dashboard statistics. One round trip, admin only, and it never returns
-- anything that identifies an individual account.
-- ---------------------------------------------------------------------------
create or replace function public.admin_dashboard_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v jsonb;
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'songs_total',            (select count(*) from public.songs),
    'songs_active',           (select count(*) from public.songs where status = 'active'),
    'songs_disabled',         (select count(*) from public.songs where status = 'disabled'),
    'videos_total',           (select count(*) from public.song_videos),
    'users_total',            (select count(*) from public.profiles),
    'admins_total',           (select count(*) from public.user_roles where role = 'admin'),
    'announcements_total',    (select count(*) from public.announcements),
    'announcements_live',     (select count(*) from public.announcements
                                where is_published
                                  and (starts_at is null or starts_at <= now())
                                  and (ends_at is null or ends_at >= now())),
    'voice_breakdown',        (
      select coalesce(jsonb_agg(x order by x->>'sort_order'), '[]'::jsonb) from (
        select jsonb_build_object(
          'id', vc.id, 'name', vc.name, 'color', vc.color, 'sort_order', vc.sort_order,
          'song_count', (select count(*) from public.song_voice_classifications s
                          join public.songs sg on sg.id = s.song_id
                          where s.voice_classification_id = vc.id and sg.status = 'active'),
          'member_count', (select count(*) from public.profiles p where p.voice_classification_id = vc.id)
        ) as x
        from public.voice_classifications vc
      ) t
    )
  ) into v;

  return v;
end $$;
grant execute on function public.admin_dashboard_stats() to authenticated;
