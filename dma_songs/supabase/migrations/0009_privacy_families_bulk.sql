-- ===========================================================================
-- 0009 — voice families (SATB), bulk song operations, member administration
--        and the fields the legal pages need.
--
-- Safe to run more than once.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. Voice families
--
-- Most arrangements are plain SATB. Forcing every one of them to be filed
-- against eight divided parts makes the editor tedious and produces eight
-- identical video slots. A family sits above the divided parts: a song can be
-- written "for Soprano" and a Soprano 1 singer matches it without anybody
-- choosing a level.
--
-- The divided parts remain the single source of truth for filtering. A simple
-- SATB song is still stored as its member parts, so every existing query,
-- policy and index keeps working untouched. `part_mode` only records which
-- editor the administrator used.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'voice_family') then
    create type public.voice_family as enum ('soprano', 'alto', 'tenor', 'bass');
  end if;
  if not exists (select 1 from pg_type where typname = 'song_part_mode') then
    create type public.song_part_mode as enum ('simple', 'detailed');
  end if;
end $$;

alter table public.voice_classifications
  add column if not exists family public.voice_family;

-- Derive the family from the existing slugs (soprano-1, alto-2, …).
update public.voice_classifications
   set family = case
     when slug like 'soprano%' then 'soprano'
     when slug like 'alto%'    then 'alto'
     when slug like 'tenor%'   then 'tenor'
     when slug like 'bass%'    then 'bass'
   end::public.voice_family
 where family is null;

create index if not exists voice_classifications_family_idx
  on public.voice_classifications (family, sort_order);

alter table public.songs
  add column if not exists part_mode public.song_part_mode not null default 'detailed';

-- A video can be for one divided part, one whole family, or the full
-- ensemble — never more than one of those at a time.
alter table public.song_videos
  add column if not exists voice_family public.voice_family;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'song_videos_target_is_singular'
  ) then
    alter table public.song_videos
      add constraint song_videos_target_is_singular
      check (voice_classification_id is null or voice_family is null);
  end if;
end $$;

-- Replace the old one-video-per-part index with three partial indexes that
-- also cover family-level and full-ensemble videos.
--
-- The obvious single index — coalescing both columns to text — will not
-- build: casting an enum to text is only STABLE, not IMMUTABLE, because enum
-- labels can be renamed, and an index expression has to be IMMUTABLE. Three
-- partial indexes avoid the cast entirely and say the rule more plainly
-- anyway: one video per divided part, one per whole voice, one for everyone.
drop index if exists song_videos_song_part_uniq;
drop index if exists song_videos_song_target_unique;

create unique index if not exists song_videos_one_per_part
  on public.song_videos (song_id, voice_classification_id)
  where voice_classification_id is not null;

create unique index if not exists song_videos_one_per_family
  on public.song_videos (song_id, voice_family)
  where voice_family is not null;

create unique index if not exists song_videos_one_general
  on public.song_videos (song_id)
  where voice_classification_id is null and voice_family is null;

-- ---------------------------------------------------------------------------
-- 2. Copyright provenance on songs
--
-- Lyrics stored on our own server are the real copyright exposure here — an
-- embedded video is somebody else's hosting problem, a reproduced lyric sheet
-- is ours. The administrator has to say where the material came from before
-- lyrics can be saved, and that answer is editable afterwards.
-- ---------------------------------------------------------------------------
alter table public.songs
  add column if not exists rights_confirmed boolean not null default false,
  add column if not exists rights_holder text,
  add column if not exists rights_basis text,
  add column if not exists rights_note text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'songs_rights_basis_known') then
    alter table public.songs
      add constraint songs_rights_basis_known
      check (rights_basis is null or rights_basis in (
        'public_domain', 'owned', 'licensed', 'permission', 'other'
      ));
  end if;
  -- Lyrics require a confirmation. Everything else about a song is fine
  -- without one.
  --
  -- Added NOT VALID on purpose. Songs that already carry lyrics predate this
  -- rule and would fail validation, and the wrong way to fix that is to
  -- auto-confirm their rights — that is precisely the assertion nobody has
  -- actually made yet. So existing rows are left alone and flagged in the
  -- admin song list, while every new write, and any edit to an old row, has
  -- to answer the question.
  if not exists (select 1 from pg_constraint where conname = 'songs_lyrics_need_rights') then
    alter table public.songs
      add constraint songs_lyrics_need_rights
      check (
        lyrics is null
        or btrim(lyrics) = ''
        or (rights_confirmed and rights_basis is not null)
      ) not valid;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 3. Member notes — administrator-only, in their own table
--
-- Deliberately not a column on `profiles`. A member can read their own
-- profile row, so a note column there would be readable by its subject, and
-- under RA 10173 that is exactly the kind of quiet mistake that turns an
-- internal remark into a disclosure.
-- ---------------------------------------------------------------------------
create table if not exists public.member_notes (
  user_id    uuid primary key references public.profiles (id) on delete cascade,
  note       text not null default '' check (char_length(note) <= 4000),
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.member_notes enable row level security;

drop policy if exists "admins read member notes" on public.member_notes;
create policy "admins read member notes"
  on public.member_notes for select to authenticated using (public.is_admin());

drop policy if exists "admins write member notes" on public.member_notes;
create policy "admins write member notes"
  on public.member_notes for insert to authenticated with check (public.is_admin());

drop policy if exists "admins update member notes" on public.member_notes;
create policy "admins update member notes"
  on public.member_notes for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admins delete member notes" on public.member_notes;
create policy "admins delete member notes"
  on public.member_notes for delete to authenticated using (public.is_admin());

grant select, insert, update, delete on public.member_notes to authenticated;
revoke all on public.member_notes from anon;

-- ---------------------------------------------------------------------------
-- 4. Consent and erasure bookkeeping on profiles
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists terms_version text,
  add column if not exists anonymized_at timestamptz,
  -- "Open the library on my own part" — a preference, not a restriction.
  add column if not exists prefers_own_part boolean not null default false;

-- ---------------------------------------------------------------------------
-- 5. Bulk song operations
--
-- One statement per action instead of N round trips, and one audit entry that
-- records the whole batch rather than fifty separate ones.
-- ---------------------------------------------------------------------------
create or replace function public.admin_bulk_song_action(
  p_song_ids uuid[],
  p_action   text,
  p_value    text default null
)
returns integer
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_count integer := 0;
  v_part  uuid;
begin
  if not public.is_admin() then
    raise exception 'Only administrators can change songs.' using errcode = '42501';
  end if;

  if p_song_ids is null or array_length(p_song_ids, 1) is null then
    return 0;
  end if;

  if array_length(p_song_ids, 1) > 500 then
    raise exception 'That is more songs than one operation should touch (limit 500).';
  end if;

  if p_action = 'set_category' then
    update public.songs
       set category = nullif(btrim(coalesce(p_value, '')), '')
     where id = any(p_song_ids);
    get diagnostics v_count = row_count;

  elsif p_action in ('enable', 'disable') then
    update public.songs
       set status = case when p_action = 'enable' then 'active' else 'disabled' end::public.song_status
     where id = any(p_song_ids);
    get diagnostics v_count = row_count;

  elsif p_action = 'delete' then
    delete from public.songs where id = any(p_song_ids);
    get diagnostics v_count = row_count;

  elsif p_action = 'add_part' then
    v_part := p_value::uuid;
    insert into public.song_voice_classifications (song_id, voice_classification_id)
    select s.id, v_part from unnest(p_song_ids) as s(id)
    on conflict do nothing;
    get diagnostics v_count = row_count;

  elsif p_action = 'remove_part' then
    v_part := p_value::uuid;
    -- Never strip a song back to no parts at all: that is a song nobody can
    -- find, and the song editor refuses to create one.
    delete from public.song_voice_classifications svc
     where svc.voice_classification_id = v_part
       and svc.song_id = any(p_song_ids)
       and (
         select count(*) from public.song_voice_classifications x where x.song_id = svc.song_id
       ) > 1;
    get diagnostics v_count = row_count;

  else
    raise exception 'Unknown bulk action: %', p_action;
  end if;

  perform public.write_activity_log(
    'song.bulk_' || p_action,
    'song',
    null,
    v_count || ' song(s)',
    jsonb_build_object('action', p_action, 'value', p_value, 'count', v_count)
  );

  return v_count;
end $$;

revoke all on function public.admin_bulk_song_action(uuid[], text, text) from public, anon;
grant execute on function public.admin_bulk_song_action(uuid[], text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 6. Member erasure
--
-- The sign-in record in auth.users is left alone: removing it needs the
-- service-role key, which has no business existing in a browser bundle. What
-- this does is strip the personal data, which is what an erasure request
-- under RA 10173 actually asks for. The account can no longer be used because
-- is_active goes false.
-- ---------------------------------------------------------------------------
create or replace function public.admin_anonymize_member(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_label text;
begin
  if not public.is_admin() then
    raise exception 'Only administrators can remove members.' using errcode = '42501';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'You cannot remove your own account from here.';
  end if;

  if exists (select 1 from public.user_roles where user_id = p_user_id and role = 'admin')
     and (select count(*) from public.user_roles where role = 'admin') <= 1 then
    raise exception 'That is the last administrator. Promote somebody else first.';
  end if;

  select coalesce(display_name, email) into v_label from public.profiles where id = p_user_id;

  update public.profiles
     set display_name             = 'Removed member',
         email                    = null,
         avatar_url               = null,
         voice_classification_id  = null,
         is_active                = false,
         anonymized_at            = now()
   where id = p_user_id;

  delete from public.user_roles      where user_id = p_user_id;
  delete from public.member_notes    where user_id = p_user_id;
  delete from public.voice_change_requests where user_id = p_user_id;

  perform public.write_activity_log(
    'user.anonymized', 'user', p_user_id, v_label, '{}'::jsonb
  );
end $$;

revoke all on function public.admin_anonymize_member(uuid) from public, anon;
grant execute on function public.admin_anonymize_member(uuid) to authenticated;

-- A member erasing themselves. Same effect, no administrator needed, which is
-- the right the Data Privacy Act actually grants them.
create or replace function public.erase_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'You have to be signed in.';
  end if;

  if exists (select 1 from public.user_roles where user_id = v_user and role = 'admin')
     and (select count(*) from public.user_roles where role = 'admin') <= 1 then
    raise exception 'You are the last administrator. Promote somebody else first.';
  end if;

  update public.profiles
     set display_name            = 'Removed member',
         email                   = null,
         avatar_url              = null,
         voice_classification_id = null,
         is_active               = false,
         anonymized_at           = now()
   where id = v_user;

  delete from public.user_roles            where user_id = v_user;
  delete from public.member_notes          where user_id = v_user;
  delete from public.voice_change_requests where user_id = v_user;

  perform public.write_activity_log('user.self_erased', 'user', v_user, null::text, '{}'::jsonb);
end $$;

revoke all on function public.erase_my_account() from public, anon;
grant execute on function public.erase_my_account() to authenticated;

-- ---------------------------------------------------------------------------
-- 7. Data export — everything held about the signed-in member, in one call.
-- ---------------------------------------------------------------------------
create or replace function public.export_my_data()
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user uuid := auth.uid();
  v_out  jsonb;
begin
  if v_user is null then
    raise exception 'You have to be signed in.';
  end if;

  select jsonb_build_object(
    'exported_at', now(),
    'account', (
      select to_jsonb(p) - 'id'
      from public.profiles p where p.id = v_user
    ),
    'voice_part', (
      select vc.name from public.profiles p
      join public.voice_classifications vc on vc.id = p.voice_classification_id
      where p.id = v_user
    ),
    'roles', (
      select coalesce(jsonb_agg(r.role), '[]'::jsonb)
      from public.user_roles r where r.user_id = v_user
    ),
    'voice_change_requests', (
      select coalesce(jsonb_agg(to_jsonb(q) - 'user_id'), '[]'::jsonb)
      from public.voice_change_requests q where q.user_id = v_user
    ),
    'note', 'Administrative notes about members are held separately and are not '
            'included here. Ask an administrator if you want to see them.'
  ) into v_out;

  return v_out;
end $$;

revoke all on function public.export_my_data() from public, anon;
grant execute on function public.export_my_data() to authenticated;

-- ---------------------------------------------------------------------------
-- 8. Settings the legal pages read.
--
-- Public so the privacy notice renders for a signed-out visitor, which is
-- the whole point of a privacy notice.
-- ---------------------------------------------------------------------------
insert into public.app_settings (key, value, label, is_public) values
  ('legal.entity_name',   '"Dalubhasaan ng Lungsod ng Lucena"'::jsonb, 'Legal entity name', true),
  ('legal.contact_email', '""'::jsonb,                                 'Privacy contact email', true),
  ('legal.dpo_name',      '""'::jsonb,                                 'Data Protection Officer', true),
  ('legal.address',       '""'::jsonb,                                 'Postal address', true),
  ('legal.effective_date','""'::jsonb,                                 'Policy effective date', true),
  ('legal.terms_version', '"1.0"'::jsonb,                              'Terms version', true)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- 9. Song save RPC, extended for families, part mode and rights fields.
--    Replaces the version in 0006.
-- ---------------------------------------------------------------------------
create or replace function public.admin_save_song(p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_song_id uuid;
  v_is_new  boolean;
  v_lyrics  text;
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  v_song_id := nullif(p_payload ->> 'id', '')::uuid;
  v_is_new  := v_song_id is null;
  v_lyrics  := nullif(p_payload ->> 'lyrics', '');

  -- Fail with a sentence rather than a constraint name.
  if v_lyrics is not null and btrim(v_lyrics) <> ''
     and not coalesce((p_payload ->> 'rights_confirmed')::boolean, false) then
    raise exception
      'Lyrics can only be saved once the rights for this song have been confirmed.'
      using errcode = '23514';
  end if;

  if v_is_new then
    insert into public.songs (title, composer, arranger, description, category,
                              lyrics, notes, thumbnail_url, status, part_mode,
                              rights_confirmed, rights_holder, rights_basis, rights_note)
    values (
      btrim(p_payload ->> 'title'),
      nullif(btrim(coalesce(p_payload ->> 'composer', '')), ''),
      nullif(btrim(coalesce(p_payload ->> 'arranger', '')), ''),
      nullif(btrim(coalesce(p_payload ->> 'description', '')), ''),
      nullif(btrim(coalesce(p_payload ->> 'category', '')), ''),
      v_lyrics,
      nullif(p_payload ->> 'notes', ''),
      nullif(btrim(coalesce(p_payload ->> 'thumbnail_url', '')), ''),
      coalesce((p_payload ->> 'status')::public.song_status, 'active'),
      coalesce((p_payload ->> 'part_mode')::public.song_part_mode, 'detailed'),
      coalesce((p_payload ->> 'rights_confirmed')::boolean, false),
      nullif(btrim(coalesce(p_payload ->> 'rights_holder', '')), ''),
      nullif(btrim(coalesce(p_payload ->> 'rights_basis', '')), ''),
      nullif(btrim(coalesce(p_payload ->> 'rights_note', '')), '')
    )
    returning id into v_song_id;
  else
    update public.songs set
      title            = btrim(p_payload ->> 'title'),
      composer         = nullif(btrim(coalesce(p_payload ->> 'composer', '')), ''),
      arranger         = nullif(btrim(coalesce(p_payload ->> 'arranger', '')), ''),
      description      = nullif(btrim(coalesce(p_payload ->> 'description', '')), ''),
      category         = nullif(btrim(coalesce(p_payload ->> 'category', '')), ''),
      lyrics           = v_lyrics,
      notes            = nullif(p_payload ->> 'notes', ''),
      thumbnail_url    = nullif(btrim(coalesce(p_payload ->> 'thumbnail_url', '')), ''),
      status           = coalesce((p_payload ->> 'status')::public.song_status, status),
      part_mode        = coalesce((p_payload ->> 'part_mode')::public.song_part_mode, part_mode),
      rights_confirmed = coalesce((p_payload ->> 'rights_confirmed')::boolean, false),
      rights_holder    = nullif(btrim(coalesce(p_payload ->> 'rights_holder', '')), ''),
      rights_basis     = nullif(btrim(coalesce(p_payload ->> 'rights_basis', '')), ''),
      rights_note      = nullif(btrim(coalesce(p_payload ->> 'rights_note', '')), '')
    where id = v_song_id;

    if not found then
      raise exception 'Song not found.' using errcode = 'P0002';
    end if;
  end if;

  -- Voice parts -------------------------------------------------------------
  -- Simple mode sends families; they are expanded to their divided parts here
  -- so that filtering, indexes and policies never need to know the difference.
  with wanted as (
    select (value #>> '{}')::uuid as vc_id
    from jsonb_array_elements(coalesce(p_payload -> 'voice_classification_ids', '[]'::jsonb))
    union
    select vc.id
    from jsonb_array_elements_text(coalesce(p_payload -> 'voice_families', '[]'::jsonb)) f
    join public.voice_classifications vc
      on vc.family = f.value::public.voice_family
     and vc.is_active
  )
  delete from public.song_voice_classifications svc
  where svc.song_id = v_song_id
    and svc.voice_classification_id not in (select vc_id from wanted);

  insert into public.song_voice_classifications (song_id, voice_classification_id)
  select v_song_id, w.vc_id
  from (
    select (value #>> '{}')::uuid as vc_id
    from jsonb_array_elements(coalesce(p_payload -> 'voice_classification_ids', '[]'::jsonb))
    union
    select vc.id
    from jsonb_array_elements_text(coalesce(p_payload -> 'voice_families', '[]'::jsonb)) f
    join public.voice_classifications vc
      on vc.family = f.value::public.voice_family
     and vc.is_active
  ) w
  on conflict do nothing;

  if not exists (select 1 from public.song_voice_classifications where song_id = v_song_id) then
    raise exception 'A song needs at least one voice part.' using errcode = '23514';
  end if;

  -- Videos ------------------------------------------------------------------
  delete from public.song_videos sv
  where sv.song_id = v_song_id
    and not exists (
      select 1
      from jsonb_array_elements(coalesce(p_payload -> 'videos', '[]'::jsonb)) v
      where nullif(v ->> 'id', '')::uuid = sv.id
    );

  insert into public.song_videos
    (id, song_id, voice_classification_id, voice_family, youtube_video_id, youtube_url, label, sort_order)
  select
    coalesce(nullif(v ->> 'id', '')::uuid, gen_random_uuid()),
    v_song_id,
    nullif(v ->> 'voice_classification_id', '')::uuid,
    nullif(v ->> 'voice_family', '')::public.voice_family,
    v ->> 'youtube_video_id',
    v ->> 'youtube_url',
    nullif(btrim(coalesce(v ->> 'label', '')), ''),
    coalesce((v ->> 'sort_order')::int, 0)
  from jsonb_array_elements(coalesce(p_payload -> 'videos', '[]'::jsonb)) v
  on conflict (id) do update set
    voice_classification_id = excluded.voice_classification_id,
    voice_family            = excluded.voice_family,
    youtube_video_id        = excluded.youtube_video_id,
    youtube_url             = excluded.youtube_url,
    label                   = excluded.label,
    sort_order              = excluded.sort_order,
    updated_at              = now();

  return v_song_id;
end $$;

revoke all on function public.admin_save_song(jsonb) from public, anon;
grant execute on function public.admin_save_song(jsonb) to authenticated;
