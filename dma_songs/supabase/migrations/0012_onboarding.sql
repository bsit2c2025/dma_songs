-- ===========================================================================
-- 0012 — first-run onboarding, and cleaning up parts nobody chose
--
-- THE BUG THIS FIXES
--   When guest voice-part selection was removed, the provider kept a one-time
--   "adopt whatever is in localStorage" step so an existing guest's choice
--   would not be lost. The effect did not distinguish a guest who had just
--   picked from a stale key left in the browser, so ANY new account signing in
--   on that browser silently inherited it. On a machine used for testing, that
--   meant every new member arrived already assigned — usually to whichever
--   part was last clicked there.
--
--   It is not cosmetic. A member's first choice is the free one; every change
--   afterwards needs administrator approval. A silent write spent that free
--   choice on a decision the member never made, leaving them needing approval
--   to correct something they never did.
--
-- Safe to run more than once.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. Onboarding state
-- ---------------------------------------------------------------------------
alter table public.profiles
  -- Null means the welcome flow has not been completed. Existing members are
  -- deliberately left null: those who already have a voice part never see the
  -- flow anyway (see the condition the app uses), and those who do not should.
  add column if not exists onboarded_at timestamptz,
  -- What the member said they sing, before anybody has assigned them a
  -- specific divided part. "I think I'm an alto" is a different claim from
  -- "you are Alto 2", and the two should not be stored in the same column.
  add column if not exists preferred_family public.voice_family,
  -- Set when the member says they do not know. This is the honest answer for
  -- most people who have never been auditioned, and it should not be a dead
  -- end — it puts them in a queue instead.
  add column if not exists needs_voice_assignment boolean not null default false;

create index if not exists profiles_needs_voice_idx
  on public.profiles (created_at)
  where needs_voice_assignment;

-- ---------------------------------------------------------------------------
-- 2. Completing the welcome flow
-- ---------------------------------------------------------------------------
create or replace function public.complete_onboarding(
  p_display_name text default null,
  p_family public.voice_family default null,
  p_unsure boolean default false
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user uuid := auth.uid();
  v_part uuid;
begin
  if v_user is null then
    raise exception 'You have to be signed in.';
  end if;

  -- Only ever run once. Re-running must not reset a part an administrator has
  -- since assigned.
  if exists (select 1 from public.profiles where id = v_user and onboarded_at is not null) then
    return;
  end if;

  if p_family is not null and not p_unsure then
    -- Assign the lowest-numbered divided part of the voice they chose —
    -- Soprano becomes Soprano 1, not Soprano 2 — as a starting point an
    -- administrator can refine. Choosing a whole voice is the answer a new
    -- singer can actually give; the level is somebody else's judgement.
    select id into v_part
    from public.voice_classifications
    where family = p_family and is_active
    order by sort_order desc
    limit 1;
  end if;

  update public.profiles
     set display_name = coalesce(nullif(btrim(coalesce(p_display_name, '')), ''), display_name),
         preferred_family = case when p_unsure then null else p_family end,
         voice_classification_id = case when p_unsure then null else v_part end,
         needs_voice_assignment = p_unsure or p_family is null,
         onboarded_at = now()
   where id = v_user;

  perform public.write_activity_log(
    'user.onboarded', 'user', v_user, null::text,
    jsonb_build_object('family', p_family, 'unsure', p_unsure)
  );
end $$;

revoke all on function public.complete_onboarding(text, public.voice_family, boolean) from public, anon;
grant execute on function public.complete_onboarding(text, public.voice_family, boolean) to authenticated;

-- Administrators assigning a specific part to somebody who did not know.
create or replace function public.admin_assign_voice_part(
  p_user_id uuid,
  p_voice_classification_id uuid
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
    raise exception 'Only administrators can assign a voice part.' using errcode = '42501';
  end if;

  update public.profiles
     set voice_classification_id = p_voice_classification_id,
         needs_voice_assignment  = false
   where id = p_user_id;

  select coalesce(display_name, email) into v_label from public.profiles where id = p_user_id;

  perform public.write_activity_log(
    'user.voice_assigned', 'user', p_user_id, v_label,
    jsonb_build_object('voice_classification_id', p_voice_classification_id)
  );
end $$;

revoke all on function public.admin_assign_voice_part(uuid, uuid) from public, anon;
grant execute on function public.admin_assign_voice_part(uuid, uuid) to authenticated;

create or replace function public.awaiting_voice_assignment_count()
returns integer
language sql
stable
security definer
set search_path = public, auth
as $$
  select case when public.is_admin() then (
    select count(*)::int from public.profiles
    where needs_voice_assignment and anonymized_at is null and is_active
  ) else 0 end;
$$;

revoke all on function public.awaiting_voice_assignment_count() from public, anon;
grant execute on function public.awaiting_voice_assignment_count() to authenticated;

-- ===========================================================================
-- 3. CLEANUP — parts that were assigned by the bug rather than chosen
--
-- Run the SELECT first and look at the list. These are accounts that hold a
-- voice part but have never once used the request flow, which is the only way
-- a member can change a part after the first pick. A genuine first choice
-- looks identical to a silent one in the data, so this cannot be perfectly
-- precise — which is why it is a review step and not an automatic UPDATE.
--
-- Anyone cleared here is not being punished: they simply get their free first
-- choice back, and the welcome flow will ask them properly.
-- ===========================================================================

select
  p.id,
  p.display_name,
  p.email,
  vc.name  as currently_assigned,
  p.created_at,
  p.updated_at,
  -- A tell-tale sign: the part was written within a minute of the account
  -- being created, which is what a silent write at sign-in looks like. A
  -- person picking from the page takes longer than that.
  (p.updated_at - p.created_at < interval '1 minute') as looks_automatic
from public.profiles p
join public.voice_classifications vc on vc.id = p.voice_classification_id
where p.anonymized_at is null
  and p.voice_classification_id is not null
  and p.onboarded_at is null
  and not exists (
    select 1 from public.voice_change_requests r where r.user_id = p.id
  )
order by looks_automatic desc, p.created_at desc;

-- ---------------------------------------------------------------------------
-- When you are happy with the list above, uncomment and run this. It clears
-- the part and sends those members through the welcome flow next time they
-- sign in.
-- ---------------------------------------------------------------------------
-- update public.profiles p
--    set voice_classification_id = null,
--        needs_voice_assignment  = true
--  where p.anonymized_at is null
--    and p.voice_classification_id is not null
--    and p.onboarded_at is null
--    and (p.updated_at - p.created_at < interval '1 minute')
--    and not exists (
--      select 1 from public.voice_change_requests r where r.user_id = p.id
--    );

-- ---------------------------------------------------------------------------
-- To clear one member by hand instead, which is often the better answer when
-- only a few are affected:
--
--   update public.profiles
--      set voice_classification_id = null, needs_voice_assignment = true
--    where email = 'them@example.com';
-- ---------------------------------------------------------------------------
