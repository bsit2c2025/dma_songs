# Security

The governing assumption: **the front end is a convenience, not a control.** Everything below is
enforced in Postgres and would still hold if the React app were deleted and someone drove the REST
API by hand with the publishable key — which is public, and is meant to be.

---

## Threat model

Who we're actually defending against, in rough order of likelihood:

1. **A curious singer** who opens developer tools, finds the Supabase URL and key in the bundle, and
   tries a few requests. Realistic. Fully covered.
2. **A former member** whose account was deactivated but whose session token hasn't expired.
3. **A stranger on the internet** hitting the REST API with the publishable key.
4. **An administrator acting carelessly** — deleting the wrong thing, or being socially engineered
   into pasting a hostile link.
5. **A compromised administrator account.** Can't be prevented by policy, but is made *visible* by an
   audit log they can't edit.

Not in scope: a compromised `service_role` key (which bypasses everything by design — keep it out of
the front end and out of the repository), or someone with direct database credentials.

---

## Layers

### 1. Row Level Security on every table

All nine tables have RLS enabled. Reads and writes are separate decisions:

| Table | anon / authenticated read | Write |
|---|---|---|
| `voice_classifications` | all rows | admin only |
| `songs` | `status = 'active'` (admins: all) | admin only |
| `song_voice_classifications` | if the parent song is visible | admin only |
| `song_videos` | if the parent song is visible | admin only |
| `announcements` | published **and** inside its date window | admin only |
| `profiles` | own row, or admin | own row (guarded), or admin |
| `user_roles` | own rows, or admin | admin only; **no UPDATE policy** |
| `activity_logs` | admin only | **no write policy at all** |
| `app_settings` | `is_public = true` rows | admin only |

**No write policy anywhere uses `using (true)`.** Every one resolves through `is_admin()` or an
ownership check.

Note what the second column doesn't say: nothing here depends on the client sending the right query.
A disabled song is invisible because the *policy* filters it, not because the app added
`.eq('status', 'active')`. Same for scheduled announcements — the window is a policy condition.

### 2. Role storage

Roles live in `user_roles`, not on `profiles`. A singer can update their own profile row, so a `role`
column there would be one policy error away from self-service administration.

`user_roles` has:
- an admin-only INSERT policy
- an admin-only DELETE policy
- **no UPDATE policy** — a role is granted or revoked, never edited in place
- a `BEFORE` trigger that refuses to remove the last remaining administrator, stamps `granted_by`, and
  writes an audit entry for every grant and revoke

### 3. The profile guard

A singer needs to edit their own row to change their display name and voice part. A `BEFORE UPDATE`
trigger freezes the columns they have no business touching — `id`, `email`, `is_active`, `created_at` —
by resetting them to their previous values whenever the caller isn't an administrator. So the update
succeeds, but silently does nothing dangerous.

### 4. `is_admin()`

```sql
create function public.is_admin(uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public, auth
```

`SECURITY DEFINER` so policies on `user_roles` don't recurse into `user_roles`. `set search_path`
pinned so a caller can't shadow a table name with something of their own. `stable` so Postgres can
cache it within a statement.

### 5. Append-only audit log

Three things make it append-only:

1. `activity_logs` has an admin-only SELECT policy and **no INSERT, UPDATE or DELETE policy**.
2. `revoke insert, update, delete on public.activity_logs from anon, authenticated;` — belt and
   braces, in case a future migration adds a policy by accident.
3. Writes happen only through `write_activity_log()`, a `SECURITY DEFINER` function whose EXECUTE
   permission is revoked from client roles. It's called by triggers, never by the app.

The consequence: an administrator can delete a song, but cannot delete the record that they deleted
it, and cannot write a record saying somebody else did.

The one exception is `log_admin_event()`, which the app *may* call — used to record admin sign-in and
sign-out. It checks `is_admin()` and accepts only a whitelist of two action names, so it can't be used
to inject arbitrary log entries.

### 6. Input handling

**Rich text** is sanitized twice — in the Zod transform before it's stored, and again at render.
Allowlist: `p br strong b em i u s ul ol li a h2 h3 blockquote code pre hr span` and the attributes
`href target rel title`. Stripped: `style script iframe form input object embed` and every `on*`
handler. URLs must match `^(?:https?:|mailto:|tel:|\/)`, so `javascript:` and `data:` are rejected. A
DOMPurify hook forces `rel="noopener noreferrer"` on anything with `target="_blank"`.

**YouTube URLs** are parsed against a host allowlist, reduced to the eleven-character ID, and
constrained in the database by `^[A-Za-z0-9_-]{11}$`. The embed URL is rebuilt by the app.

**Everything else** goes through Zod on the way in and Postgres check constraints at rest — colour is
validated as a hex value, priority is bounded 0–100, an announcement's end must follow its start, a
link label requires a link.

### 7. Transport and headers

`vercel.json` sets `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`,
`X-Frame-Options: DENY` and a `Permissions-Policy` denying camera, microphone and geolocation. Sessions
use PKCE.

---

## Test scenarios

`supabase/seed/04_rls_test_suite.sql` implements these. It impersonates each role with
`set local role` and a forged `request.jwt.claims`, runs inside `begin … rollback`, and raises a
notice per passing check. A failure aborts with the policy at fault named.

| # | Scenario | Expected | In the suite |
|---|---|---|---|
| 1 | Anonymous visitor reads active songs | allowed | yes |
| 2 | Anonymous visitor reads a disabled song | zero rows | yes |
| 3 | Anonymous visitor reads an unpublished announcement | zero rows | yes |
| 4 | Singer tries to insert a song | refused | yes |
| 5 | Singer tries to grant themselves `admin` | refused | yes |
| 5b | Singer tries to edit another member's profile | zero rows affected | yes |
| 5c | Singer tries to change their own `is_active` | silently reverted by the guard | yes |
| 6 | Singer reads the activity log | refused | yes |
| 7 | Admin creates, updates and deletes a song | allowed, and logged | yes |
| 8 | Removing the last administrator | refused by trigger | yes |
| 9 | Deleting a voice part still in use | refused with a readable message | yes |
| 10 | Anyone tries to insert into or delete from `activity_logs` | refused | yes |

**These have not been executed against a live database.** They need real user IDs from
`auth.users`, which only exist once a Supabase project is created. Run them before opening the site to
members — see the README for the three steps.

---

## Operational advice

**Keep at least two administrators.** The last-admin guard stops you locking everyone out, but a
single administrator who loses their account is still a bad afternoon.

**Deactivate, don't delete, when someone leaves.** Deactivation keeps their history in the audit log
intact. Note that deactivation doesn't revoke an existing session immediately — it takes effect on the
next token refresh, within the hour.

**Review the activity log occasionally.** It's the one place where a compromised administrator
account becomes visible.

**Never commit `.env`.** It's in `.gitignore`. The publishable key being public is fine; the habit of
committing env files is not.

**Rotate the anon key** if you ever suspect the `service_role` key leaked, and audit the log for
anything you don't recognise.

---

## Reporting a problem

Found a hole? Don't open a public issue. Contact the Music and Arts department directly, describe what
you did and what you got, and give them time to fix it before telling anyone else.
