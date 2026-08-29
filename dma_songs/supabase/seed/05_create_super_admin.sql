-- ===========================================================================
-- Make an account a SUPER ADMINISTRATOR.
--
-- A super administrator is an administrator that ordinary administrators
-- cannot demote or deactivate. There is deliberately no way to grant this
-- from inside the application: public.super_admins has no INSERT, UPDATE or
-- DELETE policy at all, so the SQL editor is the only door.
--
-- Have more than one. The protection is worth nothing if the single protected
-- account is the one that loses its password.
--
-- 1. The account must already exist — sign up through the app first.
-- 2. Replace the email below.
-- 3. Run it.
-- ===========================================================================

with target as (
  select id, email from auth.users where lower(email) = lower('you@example.com')  -- <<< CHANGE THIS
)
insert into public.super_admins (user_id, note)
select t.id, 'Protected account'
from target t
on conflict (user_id) do nothing;

-- A super administrator should hold the ordinary admin role too, so that every
-- existing policy and every list that reads user_roles sees them.
with target as (
  select id from auth.users where lower(email) = lower('you@example.com')         -- <<< AND HERE
)
insert into public.user_roles (user_id, role)
select t.id, 'admin' from target t
on conflict do nothing;

-- Confirm.
select
  u.email,
  public.is_admin(u.id)      as is_admin,
  public.is_superadmin(u.id) as is_superadmin
from auth.users u
where lower(u.email) = lower('you@example.com');                                  -- <<< AND HERE

-- ---------------------------------------------------------------------------
-- To remove the protection later (only from here):
--   delete from public.super_admins where user_id = '<uuid>';
-- ---------------------------------------------------------------------------
