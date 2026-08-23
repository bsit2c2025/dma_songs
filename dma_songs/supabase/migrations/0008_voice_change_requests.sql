-- ===========================================================================
-- 0008 — voice part change requests
--
-- A singer's voice part is now a two-tier thing:
--
--   First choice   free. A new member picks their part and starts practising.
--                  Nothing to approve, nobody to wait for.
--   Any change     goes to an administrator. Section balance is a musical
--                  decision, and letting people move themselves between
--                  sections at will makes the member list useless for
--                  planning.
--
-- Enforcement is in profiles_guard(), not in the interface. A member can send
-- whatever they like to the REST API; once their part is set, the column is
-- frozen for them and the only way it moves is an approved request.
--
-- Safe to run more than once.
-- ===========================================================================

-- Status of a request ------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'voice_request_status') then
    create type public.voice_request_status as enum ('pending', 'approved', 'rejected', 'cancelled');
  end if;
end $$;

create table if not exists public.voice_change_requests (
  id                          uuid primary key default gen_random_uuid(),
  user_id                     uuid not null references public.profiles (id) on delete cascade,
  -- The part being asked for. RESTRICT: a part with requests against it
  -- cannot silently disappear.
  requested_voice_id          uuid not null references public.voice_classifications (id) on delete restrict,
  -- Snapshot of where they were when they asked, so the queue still reads
  -- correctly after the move happens.
  current_voice_id            uuid references public.voice_classifications (id) on delete set null,
  status                      public.voice_request_status not null default 'pending',
  note                        text check (note is null or char_length(note) <= 500),
  decision_note               text check (decision_note is null or char_length(decision_note) <= 500),
  decided_by                  uuid references public.profiles (id) on delete set null,
  decided_at                  timestamptz,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  -- A decided request must say who decided it and when.
  constraint decision_is_complete check (
    (status = 'pending' and decided_at is null)
    or (status <> 'pending' and decided_at is not null)
  ),
  -- Asking for the part you already have is a no-op, not a request.
  constraint request_is_a_change check (requested_voice_id is distinct from current_voice_id)
);

-- One open request per member. Without this a singer could queue eight
-- requests and let an administrator sort it out.
create unique index if not exists voice_change_requests_one_pending
  on public.voice_change_requests (user_id)
  where status = 'pending';

create index if not exists voice_change_requests_status_idx
  on public.voice_change_requests (status, created_at desc);
create index if not exists voice_change_requests_user_idx
  on public.voice_change_requests (user_id, created_at desc);

drop trigger if exists set_updated_at on public.voice_change_requests;
create trigger set_updated_at
  before update on public.voice_change_requests
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Freeze the voice part once it is set, for anyone who is not an admin.
-- This replaces the version in 0002.
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

    -- The first choice is free; after that the column is read-only to the
    -- member and only request_voice_change() can move it. The update still
    -- succeeds so the rest of the profile edit is not lost — the voice part
    -- simply does not change.
    if old.voice_classification_id is not null
       and new.voice_classification_id is distinct from old.voice_classification_id then
      new.voice_classification_id := old.voice_classification_id;
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Member: ask for a different part.
-- ---------------------------------------------------------------------------
create or replace function public.request_voice_change(
  p_voice_classification_id uuid,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user    uuid := auth.uid();
  v_current uuid;
  v_id      uuid;
begin
  if v_user is null then
    raise exception 'You have to be signed in to request a voice part change.';
  end if;

  select voice_classification_id into v_current from public.profiles where id = v_user;

  if not exists (
    select 1 from public.voice_classifications
    where id = p_voice_classification_id and is_active
  ) then
    raise exception 'That voice part is not available.';
  end if;

  if v_current is null then
    -- Nothing to approve: this is a first choice, so apply it immediately.
    update public.profiles
       set voice_classification_id = p_voice_classification_id
     where id = v_user;
    return null;
  end if;

  if v_current = p_voice_classification_id then
    raise exception 'You are already in that voice part.';
  end if;

  if exists (
    select 1 from public.voice_change_requests
    where user_id = v_user and status = 'pending'
  ) then
    raise exception 'You already have a request waiting for approval.';
  end if;

  insert into public.voice_change_requests (user_id, requested_voice_id, current_voice_id, note)
  values (v_user, p_voice_classification_id, v_current, nullif(btrim(coalesce(p_note, '')), ''))
  returning id into v_id;

  perform public.write_activity_log(
    'voice_request.created', 'voice_request', v_id, null::text,
    jsonb_build_object('requested', p_voice_classification_id, 'current', v_current)
  );

  return v_id;
end $$;

revoke all on function public.request_voice_change(uuid, text) from public, anon;
grant execute on function public.request_voice_change(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Member: withdraw their own pending request.
-- ---------------------------------------------------------------------------
create or replace function public.cancel_voice_change_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user uuid := auth.uid();
begin
  update public.voice_change_requests
     set status = 'cancelled', decided_at = now(), decided_by = v_user
   where id = p_request_id
     and user_id = v_user
     and status = 'pending';

  if not found then
    raise exception 'That request is no longer waiting for a decision.';
  end if;

  perform public.write_activity_log(
    'voice_request.cancelled', 'voice_request', p_request_id, null::text, '{}'::jsonb
  );
end $$;

revoke all on function public.cancel_voice_change_request(uuid) from public, anon;
grant execute on function public.cancel_voice_change_request(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Admin: approve or reject. One transaction, so a request can never be
-- marked approved without the profile actually moving.
-- ---------------------------------------------------------------------------
create or replace function public.admin_decide_voice_change(
  p_request_id uuid,
  p_approve boolean,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_request public.voice_change_requests%rowtype;
  v_label   text;
begin
  if not public.is_admin() then
    raise exception 'Only administrators can decide voice part requests.'
      using errcode = '42501';
  end if;

  select * into v_request
  from public.voice_change_requests
  where id = p_request_id and status = 'pending'
  for update;

  if not found then
    raise exception 'That request has already been decided.';
  end if;

  if p_approve then
    update public.profiles
       set voice_classification_id = v_request.requested_voice_id
     where id = v_request.user_id;
  end if;

  update public.voice_change_requests
     set status        = case when p_approve then 'approved' else 'rejected' end::public.voice_request_status,
         decision_note = nullif(btrim(coalesce(p_note, '')), ''),
         decided_by    = auth.uid(),
         decided_at    = now()
   where id = p_request_id;

  select coalesce(p.display_name, p.email) || ' → ' || vc.name
    into v_label
  from public.profiles p
  join public.voice_classifications vc on vc.id = v_request.requested_voice_id
  where p.id = v_request.user_id;

  perform public.write_activity_log(
    case when p_approve then 'voice_request.approved' else 'voice_request.rejected' end,
    'voice_request', p_request_id, v_label,
    jsonb_build_object('user_id', v_request.user_id, 'requested', v_request.requested_voice_id)
  );
end $$;

revoke all on function public.admin_decide_voice_change(uuid, boolean, text) from public, anon;
grant execute on function public.admin_decide_voice_change(uuid, boolean, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.voice_change_requests enable row level security;

drop policy if exists "members read their own requests" on public.voice_change_requests;
create policy "members read their own requests"
  on public.voice_change_requests for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- Writes happen only through the SECURITY DEFINER functions above, which is
-- what keeps the one-pending-request rule and the "first choice is free" rule
-- from being negotiable. No INSERT, UPDATE or DELETE policy exists.

grant select on public.voice_change_requests to authenticated;
revoke insert, update, delete on public.voice_change_requests from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Pending count for the sidebar badge. A plain count(*) would be blocked for
-- nobody, but this keeps the badge to a single cheap call.
-- ---------------------------------------------------------------------------
create or replace function public.pending_voice_request_count()
returns integer
language sql
stable
security definer
set search_path = public, auth
as $$
  select case
    when public.is_admin()
      then (select count(*)::int from public.voice_change_requests where status = 'pending')
    else 0
  end;
$$;

revoke all on function public.pending_voice_request_count() from public, anon;
grant execute on function public.pending_voice_request_count() to authenticated;
