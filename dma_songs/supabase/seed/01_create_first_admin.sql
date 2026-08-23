-- ===========================================================================
-- Promote an existing account to administrator.
--
-- HOW TO USE
--   1. Create the account normally: Supabase Studio -> Authentication ->
--      Users -> "Add user" (or let the person sign up at /login).
--   2. Open Supabase Studio -> SQL Editor, paste this file, change the email,
--      and run it.
--
-- There is deliberately no way to become an administrator from the web app.
-- Running SQL in Studio requires project access, which is the security
-- boundary we want for the first admin.
-- ===========================================================================

insert into public.user_roles (user_id, role)
select u.id, 'admin'::public.app_role
from auth.users u
where lower(u.email) = lower('you@example.com')   -- <<< CHANGE THIS
on conflict (user_id, role) do nothing;

-- Verify:
select p.email, array_agg(r.role) as roles
from public.profiles p
join public.user_roles r on r.user_id = p.id
group by p.email
order by p.email;
