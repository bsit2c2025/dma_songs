-- ===========================================================================
-- dma_songs — 0001 initial schema
-- DLL Music and Arts Song Management System
--
-- Design notes
--  * Roles live in their own table (`user_roles`), never on `profiles`.
--    A user can update their own profile row, so a `role` column there would
--    be one policy mistake away from self-service privilege escalation.
--  * A song belongs to many voice classifications through a junction table,
--    and a video is keyed on (song, voice classification) so each part can
--    have its own practice recording. A NULL classification = general video.
--  * Only the 11-character YouTube video id is stored (plus the original URL
--    for admin reference). Embed URLs are constructed by the app, so an admin
--    can never inject arbitrary iframe HTML.
-- ===========================================================================

create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.app_role as enum ('admin', 'singer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.song_status as enum ('active', 'disabled');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- voice_classifications
-- ---------------------------------------------------------------------------
create table if not exists public.voice_classifications (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique check (char_length(btrim(name)) between 1 and 60),
  slug        text not null unique check (slug ~ '^[a-z0-9-]+$'),
  short_code  text check (char_length(short_code) between 1 and 6),
  description text check (char_length(description) <= 500),
  color       text not null default '#262C6B' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists voice_classifications_sort_idx
  on public.voice_classifications (sort_order, name);

comment on column public.voice_classifications.color is
  'Hex colour used to tag this part throughout the UI. Stored in the database so admins can restyle parts without a code change.';

-- ---------------------------------------------------------------------------
-- profiles  (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id                      uuid primary key references auth.users (id) on delete cascade,
  display_name            text not null default '' check (char_length(display_name) <= 120),
  email                   text,
  avatar_url              text,
  voice_classification_id uuid references public.voice_classifications (id) on delete set null,
  is_active               boolean not null default true,
  last_seen_at            timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
create index if not exists profiles_voice_idx on public.profiles (voice_classification_id);
create index if not exists profiles_created_idx on public.profiles (created_at desc);

-- ---------------------------------------------------------------------------
-- user_roles
-- ---------------------------------------------------------------------------
-- user_id points at public.profiles (which is itself keyed to auth.users) so
-- PostgREST can embed roles when listing members, and so a deleted profile
-- takes its role assignments with it.
create table if not exists public.user_roles (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  role       public.app_role not null,
  granted_by uuid references auth.users (id) on delete set null,
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);
create index if not exists user_roles_role_idx on public.user_roles (role);

-- ---------------------------------------------------------------------------
-- songs
-- ---------------------------------------------------------------------------
create table if not exists public.songs (
  id            uuid primary key default gen_random_uuid(),
  title         text not null check (char_length(btrim(title)) between 1 and 200),
  composer      text check (char_length(composer) <= 160),
  arranger      text check (char_length(arranger) <= 160),
  description   text check (char_length(description) <= 2000),
  category      text check (char_length(category) <= 80),
  lyrics        text check (char_length(lyrics) <= 20000),
  notes         text check (char_length(notes) <= 5000),
  thumbnail_url text check (thumbnail_url is null or thumbnail_url ~ '^https?://'),
  status        public.song_status not null default 'active',
  created_by    uuid references auth.users (id) on delete set null,
  updated_by    uuid references auth.users (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists songs_status_idx   on public.songs (status);
create index if not exists songs_created_idx  on public.songs (created_at desc);
create index if not exists songs_category_idx on public.songs (category) where category is not null;
create index if not exists songs_title_trgm_idx
  on public.songs using gin (title gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- song_voice_classifications  (many-to-many)
-- ---------------------------------------------------------------------------
create table if not exists public.song_voice_classifications (
  song_id                 uuid not null references public.songs (id) on delete cascade,
  voice_classification_id uuid not null references public.voice_classifications (id) on delete restrict,
  created_at              timestamptz not null default now(),
  primary key (song_id, voice_classification_id)
);
create index if not exists svc_voice_idx on public.song_voice_classifications (voice_classification_id);

-- ---------------------------------------------------------------------------
-- song_videos  (one practice video per song + part; NULL part = general)
-- ---------------------------------------------------------------------------
create table if not exists public.song_videos (
  id                      uuid primary key default gen_random_uuid(),
  song_id                 uuid not null references public.songs (id) on delete cascade,
  voice_classification_id uuid references public.voice_classifications (id) on delete restrict,
  youtube_video_id        text not null check (youtube_video_id ~ '^[A-Za-z0-9_-]{11}$'),
  youtube_url             text not null check (
    youtube_url ~* '^https://(www\.)?(youtube\.com|youtu\.be|m\.youtube\.com|music\.youtube\.com)/'
  ),
  label                   text check (char_length(label) <= 120),
  sort_order              integer not null default 0,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
create index if not exists song_videos_song_idx on public.song_videos (song_id);
create unique index if not exists song_videos_song_part_uniq
  on public.song_videos (song_id, coalesce(voice_classification_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- ---------------------------------------------------------------------------
-- announcements
-- ---------------------------------------------------------------------------
create table if not exists public.announcements (
  id           uuid primary key default gen_random_uuid(),
  title        text not null check (char_length(btrim(title)) between 1 and 160),
  content      text not null check (char_length(content) between 1 and 20000),
  image_url    text check (image_url is null or image_url ~ '^https?://'),
  link_url     text check (link_url is null or link_url ~ '^(https?://|/)'),
  link_label   text check (char_length(link_label) <= 60),
  is_published boolean not null default false,
  is_pinned    boolean not null default false,
  priority     smallint not null default 0 check (priority between 0 and 100),
  starts_at    timestamptz,
  ends_at      timestamptz,
  created_by   uuid references auth.users (id) on delete set null,
  updated_by   uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint announcements_window_ck check (starts_at is null or ends_at is null or ends_at > starts_at),
  constraint announcements_link_label_ck check (link_label is null or link_url is not null)
);
create index if not exists announcements_public_idx
  on public.announcements (is_pinned desc, priority desc, created_at desc)
  where is_published;
create index if not exists announcements_window_idx on public.announcements (starts_at, ends_at);

-- ---------------------------------------------------------------------------
-- activity_logs  (append-only audit trail, written by triggers only)
-- ---------------------------------------------------------------------------
create table if not exists public.activity_logs (
  id            uuid primary key default gen_random_uuid(),
  actor_id      uuid references auth.users (id) on delete set null,
  actor_email   text,
  action        text not null check (char_length(action) <= 80),
  resource_type text not null check (char_length(resource_type) <= 40),
  resource_id   uuid,
  resource_label text check (char_length(resource_label) <= 200),
  metadata      jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);
create index if not exists activity_logs_created_idx  on public.activity_logs (created_at desc);
create index if not exists activity_logs_resource_idx on public.activity_logs (resource_type, resource_id);
create index if not exists activity_logs_actor_idx    on public.activity_logs (actor_id);

-- ---------------------------------------------------------------------------
-- app_settings  (key/value; `is_public` decides anon readability)
-- ---------------------------------------------------------------------------
create table if not exists public.app_settings (
  key        text primary key check (key ~ '^[a-z0-9_.]+$'),
  value      jsonb not null,
  label      text,
  is_public  boolean not null default false,
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);
