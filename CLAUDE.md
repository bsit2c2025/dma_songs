# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

The application lives in `dma_songs/`, one level below the git root. **Run every npm command from
`dma_songs/`, not from the repository root.** The root also holds `dma_songs.zip` (a committed
snapshot, not a build input) and a `README.md` that is a stale copy — `dma_songs/README.md` is the
current one.

Note that `dma_songs/.env` is tracked in git from before the ignore rule was added. It contains only
`VITE_`-prefixed values (the Supabase URL and the publishable/anon key, both public by design).

## Commands

```bash
cd dma_songs
npm install
npm run dev         # Vite dev server on http://localhost:5173
npm run build       # tsc -b, then vite build → dist/
npm run typecheck   # types only
npm run preview     # serve the production build
```

There is **no test runner and no linter configured**. The verification loop is `npm run build`
(TypeScript is strict, with `noUnusedLocals`/`noUnusedParameters`, so the type-check catches most
regressions). The only automated tests are SQL: `supabase/seed/04_rls_test_suite.sql`, pasted into
the Supabase SQL Editor after filling in two real user IDs at the top. It runs inside
`begin … rollback`, so it leaves no trace, and it has never been run against a live project.

Database changes are applied by pasting `supabase/migrations/*.sql` into the Supabase SQL Editor in
numeric order, or via `npx supabase db push`. Every migration is written to be safely re-runnable.

## Architecture

React 18 + TypeScript + Vite SPA on Vercel, talking directly to Supabase (Postgres, Auth, Storage,
PostgREST, RPC). **There is no server of our own** — that is the central constraint. Every rule that
matters is enforced in the database, because the browser is the only other place to put it and the
browser can be bypassed.

`docs/ARCHITECTURE.md` explains the reasoning behind each decision below; `docs/SECURITY.md` covers
the threat model. Read them before changing anything in `supabase/migrations/`.

### Strict layering

```
component  →  hook (src/hooks)  →  service (src/services)  →  supabase client
```

`src/lib/supabase.ts` is imported **only** by files under `src/services/`. A component must never
call Supabase, and must not construct a query key inline — keys live in `src/lib/queryKeys.ts` so
invalidation stays predictable. Zod schemas in `src/schemas/` are shared between the form resolver
and the service that submits, so form validation and wire validation cannot drift.

When adding a feature, the shape is: migration → service function → hook → page. Errors surface
through `toAppError`/`errorMessage` in `src/lib/errors.ts`, which maps Postgres codes to plain
sentences and passes through database `RAISE EXCEPTION` messages verbatim (those are written for
people).

### Security boundary

- RLS is on every table; no write policy uses `using (true)`. Admin checks go through the
  `SECURITY DEFINER` function `is_admin()` so policies don't recurse into `user_roles`.
- Roles live in `user_roles`, never as a column on `profiles`. That table has **no UPDATE policy at
  all** — roles are granted or revoked. `super_admins` has no write policy of any kind; it is
  reachable only from the SQL Editor (`supabase/seed/05_create_super_admin.sql`).
- `isAdmin` from `AuthProvider` and the guards in `src/features/auth/guards.tsx` are **UX
  affordances only**. They decide what renders, never whether an action succeeds. Don't add a check
  in a guard and consider the feature protected — add the policy.
- `activity_logs` is written by database triggers, not by the client, and has an explicit
  `revoke insert, update, delete`. Do not add client-side audit writes.
- Rich text is sanitized twice (Zod on save, `RichText` on render) against the narrow allowlist in
  `src/lib/sanitize.ts`.
- Only the 11-character YouTube ID is stored; the embed URL is rebuilt by the app against
  `youtube-nocookie.com`, and the iframe doesn't mount until play is pressed. No admin-supplied
  string ever reaches an `iframe src`.

### Multi-table writes go through RPC

Anything touching more than one table is a `SECURITY DEFINER` Postgres function that re-checks
`is_admin()` itself: `admin_save_song`, `admin_bulk_song_action`, `admin_dashboard_stats`,
`admin_set_member_approval`, `admin_set_attendance`, `complete_onboarding`, `erase_my_account`, and
the rest (grep `\.rpc(` in `src/services/`). Three REST calls from a browser can leave a song with
parts but no videos; one function call cannot.

### Traps that have already bitten this codebase

- **Voice-part filtering embeds the junction table twice** (`src/services/songs.ts`): an aliased
  `!inner` copy narrows the result set, a plain copy returns every part for display. Filtering
  through a single embed also narrows the embedded rows, so a four-part song appears to have one.
- **Inside `admin_save_song`, the video delete and insert are separate statements.** As one
  data-modifying CTE, the insert still sees uncommitted rows and moving a video between parts
  collides with the unique index.
- **Lyrics won't save until rights provenance is recorded** — enforced by a database constraint, not
  by the form.
- **A member's first voice-part choice is free; every later change needs admin approval**, enforced
  in `profiles_guard()`. Migration 0012 exists because a stale `localStorage` key was silently
  spending that free choice for new accounts.
- **Realtime is deliberately limited to `songs` and `announcements`** (events live in the
  announcements table). Messages only say *something changed* — `useRealtimeSync` invalidates
  queries and never writes payloads into the cache, so a refetch still goes through RLS. Each
  replicated table costs a connection slot per device on the free tier; don't add tables by habit.
- `src/types/database.ts` is **hand-written** to match the migrations so the repo type-checks with no
  live project. Update it when the schema changes, or regenerate with
  `npx supabase gen types typescript --project-id <ref> --schema public`.

### Access model

Guests see the landing page, announcements and events. Songs, videos and lyrics are members-only, and
an account starts **pending** until an admin approves it (`RequireApprovedMember` redirects through
`/pending`, `/deactivated`, `/welcome`). There is no path to admin from inside the app — the first
administrator is created with `supabase/seed/01_create_first_admin.sql`.

### Routing and code splitting

`src/App.tsx` holds every route. Public pages are lazy except `Home`; everything under `/admin` is
lazy, so a guest never downloads the dashboard. Keep that split when adding pages. Vendor chunks
(react, supabase, query) are split manually in `vite.config.ts`.

Path alias: `@/` → `src/`.
