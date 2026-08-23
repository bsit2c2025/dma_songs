-- ===========================================================================
-- dma_songs — diagnostics
--
-- Read-only. Changes nothing. Paste the whole file into the Supabase SQL
-- Editor, put your email on the line marked CHANGE THIS, and run it.
--
-- It returns one row per check with a PASS / FAIL / INFO verdict. Send the
-- whole result table back and it will say exactly which of the three problems
-- you are hitting.
-- ===========================================================================

with target as (
  select lower('you@example.com') as email          -- <<< CHANGE THIS
),

-- Did every migration actually finish? -------------------------------------
tables as (
  select unnest(array[
    'voice_classifications','profiles','user_roles','songs',
    'song_voice_classifications','song_videos','announcements',
    'activity_logs','app_settings','voice_change_requests'
  ]) as t
),
table_check as (
  select
    '01 table: ' || t.t as check_name,
    case when to_regclass('public.' || t.t) is null then 'FAIL' else 'PASS' end as verdict,
    case when to_regclass('public.' || t.t) is null
      then 'missing — 0001_init_schema.sql did not finish'
      else 'exists' end as detail
  from tables t
),

-- RLS enabled AND policies present. Enabled with zero policies denies all. --
rls_check as (
  select
    '02 RLS: ' || c.relname as check_name,
    case
      when not c.relrowsecurity then 'FAIL'
      when p.policy_count = 0 then 'FAIL'
      else 'PASS'
    end as verdict,
    case
      when not c.relrowsecurity then 'RLS is OFF — 0003 did not run'
      when p.policy_count = 0
        then 'RLS on but NO POLICIES — every read returns zero rows. Re-run 0003_rls_policies.sql'
      else p.policy_count || ' policies'
    end as detail
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
  left join lateral (
    select count(*) as policy_count from pg_policies
    where schemaname = 'public' and tablename = c.relname
  ) p on true
  where c.relname in (select t from tables)
    and c.relkind = 'r'
),

-- Table-level grants. Policies do nothing if the role cannot reach the table.
-- A policy is never consulted if the role cannot open the table at all.
-- Missing SELECT here is silent: queries succeed and return zero rows.
grant_check as (
  select
    '03 grant: ' || g.table_name || ' -> ' || g.grantee as check_name,
    case
      when g.privs like '%SELECT%' then 'PASS'
      -- profiles, user_roles and activity_logs are authenticated-only by design
      when g.grantee = 'anon'
       and g.table_name in ('profiles','user_roles','activity_logs','voice_change_requests') then 'PASS'
      else 'FAIL'
    end as verdict,
    case
      when g.privs like '%SELECT%'
        or (g.grantee = 'anon'
            and g.table_name in ('profiles','user_roles','activity_logs','voice_change_requests'))
      then coalesce(g.privs, '(none, by design)')
      else 'NO SELECT PRIVILEGE — every read returns zero rows regardless of '
           'policy. Run 0007_grants.sql. Currently: ' || coalesce(g.privs, 'none')
    end as detail
  from (
    select
      t.t as table_name,
      r.grantee,
      (select string_agg(x.privilege_type, ', ' order by x.privilege_type)
         from information_schema.role_table_grants x
        where x.table_schema = 'public'
          and x.table_name = t.t
          and x.grantee = r.grantee) as privs
    from tables t
    cross join (select unnest(array['anon','authenticated']) as grantee) r
  ) g
),

-- Required functions --------------------------------------------------------
fn_check as (
  select
    '04 function: ' || f as check_name,
    case when to_regprocedure(f) is null then 'FAIL' else 'PASS' end as verdict,
    case when to_regprocedure(f) is null
      then 'missing — 0002 or 0006 did not finish' else 'exists' end as detail
  from unnest(array[
    'public.is_admin(uuid)',
    'public.admin_dashboard_stats()',
    'public.admin_save_song(jsonb)',
    'public.handle_new_user()',
    'public.request_voice_change(uuid, text)',
    'public.admin_decide_voice_change(uuid, boolean, text)',
    'public.pending_voice_request_count()'
  ]) as f
),

-- The account itself --------------------------------------------------------
acct as (
  select u.id, u.email, u.email_confirmed_at
  from auth.users u, target
  where lower(u.email) = target.email
),
acct_check as (
  select '09 email placeholder was changed' as check_name,
         case when (select email from target) = 'you@example.com' then 'FAIL' else 'PASS' end as verdict,
         case when (select email from target) = 'you@example.com'
           then 'You did not edit the email on the CHANGE THIS line, so every check '
                'from 10 to 15 below is meaningless. Put your real address there and re-run.'
           else 'checking ' || (select email from target) end as detail
  union all
  select '10 account exists in auth.users',
         case when exists (select 1 from acct) then 'PASS' else 'FAIL' end,
         coalesce((select 'id ' || id::text from acct),
                  'no auth.users row with that email — check for a typo, or see check 09')
  union all
  select '11 email confirmed',
         case when (select email_confirmed_at from acct) is not null then 'PASS' else 'FAIL' end,
         coalesce((select email_confirmed_at::text from acct),
                  'not confirmed — sign-in may be refused if confirmation is required')
  union all
  select '12 profile row exists',
         case when exists (select 1 from public.profiles p, acct a where p.id = a.id)
              then 'PASS' else 'FAIL' end,
         coalesce((select 'display_name: ' || coalesce(p.display_name,'(null)')
                   from public.profiles p, acct a where p.id = a.id),
                  'NO PROFILE ROW. handle_new_user() did not fire — the account was '
                  'created before 0002 ran. See the fix note below.')
  union all
  select '13 profile is_active',
         case when (select p.is_active from public.profiles p, acct a where p.id = a.id)
              then 'PASS' else 'FAIL' end,
         'is_active must be true'
  union all
  select '14 admin role assigned',
         case when exists (
                select 1 from public.user_roles r, acct a
                where r.user_id = a.id and r.role = 'admin'
              ) then 'PASS' else 'FAIL' end,
         coalesce((select string_agg(r.role::text, ', ')
                   from public.user_roles r, acct a where r.user_id = a.id),
                  'NO ROLES AT ALL. If the profile row is also missing, the insert in '
                  '01_create_first_admin.sql failed silently on the profiles foreign key.')
  union all
  select '15 is_admin() agrees',
         case when (select public.is_admin(a.id) from acct a) then 'PASS' else 'FAIL' end,
         'this is what the database itself thinks'
),

-- Content counts. Zero here means the seed never landed. --------------------
content_check as (
  select '20 voice parts seeded' as check_name,
         case when (select count(*) from public.voice_classifications) = 8 then 'PASS' else 'FAIL' end,
         (select count(*)::text from public.voice_classifications) || ' rows (expected 8 from 0005)'
  union all
  select '21 songs total',
         case when (select count(*) from public.songs) > 0 then 'PASS' else 'INFO' end,
         (select count(*)::text from public.songs) || ' songs, of which '
           || (select count(*)::text from public.songs where status = 'active') || ' active'
  union all
  select '22 song/part links',
         'INFO',
         (select count(*)::text from public.song_voice_classifications) || ' rows'
  union all
  select '23 videos',
         'INFO',
         (select count(*)::text from public.song_videos) || ' rows'
  union all
  select '24 announcements',
         'INFO',
         (select count(*)::text from public.announcements) || ' total, '
           || (select count(*)::text from public.announcements
               where is_published
                 and (starts_at is null or starts_at <= now())
                 and (ends_at is null or ends_at > now())) || ' currently live'
  union all
  select '25 public settings',
         case when (select count(*) from public.app_settings where is_public) > 0 then 'PASS' else 'FAIL' end,
         (select count(*)::text from public.app_settings) || ' settings rows'
),

-- What an anonymous visitor would actually see ------------------------------
anon_check as (
  select '30 anon can read active songs' as check_name,
         'INFO' as verdict,
         'run the anon block at the bottom of this file to test properly' as detail
)

select * from table_check
union all select * from rls_check
union all select * from grant_check
union all select * from fn_check
union all select * from acct_check
union all select * from content_check
union all select * from anon_check
order by check_name;


-- ===========================================================================
-- SEPARATE TEST — what an anonymous visitor sees.
-- Highlight and run this block on its own. It rolls back.
-- ===========================================================================
-- begin;
--   set local role anon;
--   select 'anon sees ' || count(*) || ' songs' from public.songs;
--   select 'anon sees ' || count(*) || ' voice parts' from public.voice_classifications;
--   select 'anon sees ' || count(*) || ' announcements' from public.announcements;
--   select 'anon sees ' || count(*) || ' public settings' from public.app_settings;
-- rollback;


-- ===========================================================================
-- FIX — missing profile row.
-- If check 12 said FAIL, the account predates the trigger. This backfills a
-- profile for every auth user that lacks one. Safe to run more than once.
-- ===========================================================================
-- insert into public.profiles (id, email, display_name)
-- select u.id,
--        u.email,
--        coalesce(u.raw_user_meta_data ->> 'full_name',
--                 u.raw_user_meta_data ->> 'name',
--                 split_part(u.email, '@', 1))
-- from auth.users u
-- left join public.profiles p on p.id = u.id
-- where p.id is null
-- on conflict (id) do nothing;
--
-- -- then re-run 01_create_first_admin.sql
