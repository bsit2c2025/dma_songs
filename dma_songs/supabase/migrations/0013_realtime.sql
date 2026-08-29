-- ===========================================================================
-- 0013 — realtime replication for the two tables that need it
--
-- Scope is deliberately narrow. Every table added here holds an open
-- websocket message stream for every connected device, and the free tier caps
-- both concurrent connections and message throughput. With around ten people
-- that is not close to a problem — but it becomes one quickly if every table
-- is added out of habit, so only the two whose staleness people actually
-- noticed are included:
--
--   songs          a song added or deleted on a laptop should disappear from
--                  a phone without a hard refresh. Editing a song always
--                  touches this row (the save function updates it, and its
--                  parts and videos hang off it), so one subscription covers
--                  additions, edits and deletions.
--
--   announcements  the same table holds events, so this covers both.
--
-- Not included, on purpose: song_videos and song_voice_classifications (their
-- parent song row already changes), activity_logs (write-heavy, nobody watches
-- it live), profiles and user_roles (private, and the admin badges already
-- poll every thirty seconds for a fraction of the cost).
--
-- Row Level Security still applies to realtime. A signed-out visitor cannot
-- read songs, so they receive no song messages either — the gate is the same
-- one the REST API uses, not a second thing to keep in step.
--
-- Safe to run more than once.
-- ===========================================================================

do $$
begin
  -- Supabase creates this publication on project setup. Guard anyway, so this
  -- migration is not the thing that fails on a project where it is missing.
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'songs'
  ) then
    alter publication supabase_realtime add table public.songs;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'announcements'
  ) then
    alter publication supabase_realtime add table public.announcements;
  end if;
end $$;

-- Default replica identity sends the primary key on a delete, which is all the
-- app needs: every message is treated as "something changed, refetch", never
-- as the new state itself. REPLICA IDENTITY FULL would put the entire old row
-- on the wire for every delete, including lyrics, for no gain.
alter table public.songs         replica identity default;
alter table public.announcements replica identity default;

-- Confirm.
select schemaname, tablename
from pg_publication_tables
where pubname = 'supabase_realtime' and schemaname = 'public'
order by tablename;
