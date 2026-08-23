-- ===========================================================================
-- RLS regression tests — paste into the Supabase SQL editor and run.
--
-- Each block impersonates an API caller the way PostgREST does (role + JWT
-- claims), then asserts the attack fails. The first failure raises and the
-- whole script rolls back, so it is safe to run against a live project.
--
-- BEFORE RUNNING: put a real singer id and admin id in the two lines below.
--   select u.id, u.email, public.is_admin(u.id) from auth.users u;
-- ===========================================================================
begin;

select set_config('dma.singer_id', '00000000-0000-0000-0000-000000000001', false);  -- <<< CHANGE
select set_config('dma.admin_id',  '00000000-0000-0000-0000-000000000002', false);  -- <<< CHANGE

create or replace function pg_temp.assert(cond boolean, label text)
returns void language plpgsql as $fn$
begin
  if not cond then raise exception 'FAILED — %', label; end if;
  raise notice 'PASS — %', label;
end $fn$;

create or replace function pg_temp.act_as(uid text, r text)
returns void language plpgsql as $fn$
begin
  execute format('set local role %I', r);
  perform set_config('request.jwt.claims',
    json_build_object('sub', uid, 'role', r)::text, true);
end $fn$;

-- Test 1 — a guest reads active content only --------------------------------
do $$
begin
  perform pg_temp.act_as(null, 'anon');
  perform pg_temp.assert(
    not exists (select 1 from public.songs where status = 'disabled'),
    'Test 1: guests cannot see disabled songs');
  perform pg_temp.assert(
    (select count(*) from public.voice_classifications) = 8,
    'Test 1: guests can read the eight voice parts');
  reset role;
end $$;

-- Test 6 — a guest cannot write ---------------------------------------------
do $$
begin
  perform pg_temp.act_as(null, 'anon');
  begin
    insert into public.songs (title) values ('hacked by anon');
    raise exception 'FAILED — Test 6: anonymous insert into songs succeeded';
  exception when insufficient_privilege then
    raise notice 'PASS — Test 6: anonymous write rejected by RLS';
  end;
  reset role;
end $$;

-- Test 4 — a singer cannot modify a song ------------------------------------
do $$
declare v_rows integer;
begin
  perform pg_temp.act_as(current_setting('dma.singer_id'), 'authenticated');
  update public.songs set title = title || ' (hacked)';
  get diagnostics v_rows = row_count;
  perform pg_temp.assert(v_rows = 0, 'Test 4: singer song update changed no rows');
  begin
    insert into public.songs (title) values ('hacked by singer');
    raise exception 'FAILED — Test 4: singer inserted a song';
  exception when insufficient_privilege then
    raise notice 'PASS — Test 4: singer insert rejected by RLS';
  end;
  reset role;
end $$;

-- Test 5 — a singer cannot promote themselves -------------------------------
do $$
begin
  perform pg_temp.act_as(current_setting('dma.singer_id'), 'authenticated');
  begin
    insert into public.user_roles (user_id, role)
    values (current_setting('dma.singer_id')::uuid, 'admin');
    raise exception 'FAILED — Test 5: singer granted themselves admin';
  exception when insufficient_privilege then
    raise notice 'PASS — Test 5: self-promotion rejected by RLS';
  end;
  reset role;
end $$;

-- Test 5b — protected profile columns survive a hostile update --------------
do $$
declare v_active boolean; v_email text;
begin
  perform pg_temp.act_as(current_setting('dma.singer_id'), 'authenticated');
  update public.profiles
     set is_active = false, email = 'attacker@example.com'
   where id = current_setting('dma.singer_id')::uuid;
  select is_active, email into v_active, v_email
    from public.profiles where id = current_setting('dma.singer_id')::uuid;
  perform pg_temp.assert(v_active and v_email is distinct from 'attacker@example.com',
    'Test 5b: is_active and email were preserved by the profile guard');
  reset role;
end $$;

-- Test 5c — a singer sees only their own profile ----------------------------
do $$
begin
  perform pg_temp.act_as(current_setting('dma.singer_id'), 'authenticated');
  perform pg_temp.assert((select count(*) from public.profiles) <= 1,
    'Test 5c: singer reads only their own profile row');
  perform pg_temp.assert((select count(*) from public.activity_logs) = 0,
    'Test 5c: singer cannot read the audit log');
  reset role;
end $$;

-- Test 10 — scheduled announcements stay hidden outside their window --------
do $$
begin
  perform pg_temp.act_as(null, 'anon');
  perform pg_temp.assert(
    not exists (
      select 1 from public.announcements
      where not is_published
         or (ends_at is not null and ends_at < now())
         or (starts_at is not null and starts_at > now())
    ),
    'Test 10: unpublished, expired and future announcements are invisible to guests');
  reset role;
end $$;

-- The audit trail cannot be forged, even by an administrator ----------------
do $$
begin
  perform pg_temp.act_as(current_setting('dma.admin_id'), 'authenticated');
  begin
    insert into public.activity_logs (action, resource_type) values ('forged', 'song');
    raise exception 'FAILED — an admin forged an audit entry';
  exception when insufficient_privilege then
    raise notice 'PASS — the audit log is not writable through the API';
  end;
  reset role;
end $$;

-- An admin can read and write ------------------------------------------------
do $$
begin
  perform pg_temp.act_as(current_setting('dma.admin_id'), 'authenticated');
  perform pg_temp.assert(public.is_admin(), 'Admin: is_admin() is true');
  perform pg_temp.assert((select count(*) from public.profiles) >= 1,
    'Admin: can list member profiles');
  reset role;
end $$;

rollback;
