-- ===========================================================================
-- dma_songs — 0006 transactional song writer
--
-- A song, its voice parts and its per-part videos are three tables. Doing
-- that from the browser as three REST calls can leave a song half-saved if
-- the tab closes in between, so the whole write happens in one function =
-- one transaction. SECURITY DEFINER is paired with an explicit is_admin()
-- check; nothing else in the function trusts the caller.
-- ===========================================================================

create or replace function public.admin_save_song(p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_song_id uuid;
  v_is_new  boolean;
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  v_song_id := nullif(p_payload ->> 'id', '')::uuid;
  v_is_new  := v_song_id is null;

  if v_is_new then
    insert into public.songs (title, composer, arranger, description, category,
                              lyrics, notes, thumbnail_url, status)
    values (
      btrim(p_payload ->> 'title'),
      nullif(btrim(coalesce(p_payload ->> 'composer', '')), ''),
      nullif(btrim(coalesce(p_payload ->> 'arranger', '')), ''),
      nullif(btrim(coalesce(p_payload ->> 'description', '')), ''),
      nullif(btrim(coalesce(p_payload ->> 'category', '')), ''),
      nullif(p_payload ->> 'lyrics', ''),
      nullif(p_payload ->> 'notes', ''),
      nullif(btrim(coalesce(p_payload ->> 'thumbnail_url', '')), ''),
      coalesce((p_payload ->> 'status')::public.song_status, 'active')
    )
    returning id into v_song_id;
  else
    update public.songs set
      title         = btrim(p_payload ->> 'title'),
      composer      = nullif(btrim(coalesce(p_payload ->> 'composer', '')), ''),
      arranger      = nullif(btrim(coalesce(p_payload ->> 'arranger', '')), ''),
      description   = nullif(btrim(coalesce(p_payload ->> 'description', '')), ''),
      category      = nullif(btrim(coalesce(p_payload ->> 'category', '')), ''),
      lyrics        = nullif(p_payload ->> 'lyrics', ''),
      notes         = nullif(p_payload ->> 'notes', ''),
      thumbnail_url = nullif(btrim(coalesce(p_payload ->> 'thumbnail_url', '')), ''),
      status        = coalesce((p_payload ->> 'status')::public.song_status, status)
    where id = v_song_id;

    if not found then
      raise exception 'Song not found.' using errcode = 'P0002';
    end if;
  end if;

  -- Voice parts -------------------------------------------------------------
  with wanted as (
    select (value #>> '{}')::uuid as vc_id
    from jsonb_array_elements(coalesce(p_payload -> 'voice_classification_ids', '[]'::jsonb))
  )
  delete from public.song_voice_classifications svc
  where svc.song_id = v_song_id
    and svc.voice_classification_id not in (select vc_id from wanted);

  insert into public.song_voice_classifications (song_id, voice_classification_id)
  select v_song_id, (value #>> '{}')::uuid
  from jsonb_array_elements(coalesce(p_payload -> 'voice_classification_ids', '[]'::jsonb))
  on conflict do nothing;

  if not exists (select 1 from public.song_voice_classifications where song_id = v_song_id) then
    raise exception 'A song needs at least one voice part.' using errcode = '23514';
  end if;

  -- Videos ------------------------------------------------------------------
  -- Delete and insert are separate statements on purpose: run as one
  -- data-modifying CTE, the unique index on (song_id, voice_classification_id)
  -- would still see rows the DELETE has not committed when a video moves from
  -- one part to another.
  delete from public.song_videos sv
  where sv.song_id = v_song_id
    and not exists (
      select 1
      from jsonb_array_elements(coalesce(p_payload -> 'videos', '[]'::jsonb)) v
      where nullif(v ->> 'id', '')::uuid = sv.id
    );

  insert into public.song_videos
    (id, song_id, voice_classification_id, youtube_video_id, youtube_url, label, sort_order)
  select
    coalesce(nullif(v ->> 'id', '')::uuid, gen_random_uuid()),
    v_song_id,
    nullif(v ->> 'voice_classification_id', '')::uuid,
    v ->> 'youtube_video_id',
    v ->> 'youtube_url',
    nullif(btrim(coalesce(v ->> 'label', '')), ''),
    coalesce((v ->> 'sort_order')::int, 0)
  from jsonb_array_elements(coalesce(p_payload -> 'videos', '[]'::jsonb)) v
  on conflict (id) do update set
    voice_classification_id = excluded.voice_classification_id,
    youtube_video_id        = excluded.youtube_video_id,
    youtube_url             = excluded.youtube_url,
    label                   = excluded.label,
    sort_order              = excluded.sort_order,
    updated_at              = now();

  return v_song_id;
end $$;

revoke all on function public.admin_save_song(jsonb) from public, anon;
grant execute on function public.admin_save_song(jsonb) to authenticated;

comment on function public.admin_save_song(jsonb) is
  'Creates or updates a song together with its voice parts and per-part videos in a single transaction. Admin only.';
