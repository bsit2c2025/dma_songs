# Acceptance checklist

Honest status against the brief. **Verified** means checked by running something. **Built** means the
code exists and type-checks but needs a live Supabase project to confirm end to end.

## Stack and tooling

| Requirement | Status |
|---|---|
| React + Vite + TypeScript | Verified — `tsc -b` clean, strict mode, no `any` |
| Tailwind + shadcn-style components | Verified — builds, components hand-written on Radix |
| React Router, TanStack Query, React Hook Form, Zod | Verified — in use across all pages |
| lucide-react icons | Verified |
| Supabase (auth, Postgres, RLS, storage, RPC) | Built — migrations written, not yet run |
| Vercel deployment | Built — `vercel.json` present; deploy steps in README |
| Production build succeeds | Verified — `npm run build` passes |

## Data model

| Requirement | Status |
|---|---|
| 8 voice classifications, exact names | Verified in `0005_seed_reference_data.sql` |
| Songs many-to-many with voice parts | Built — junction table with RESTRICT |
| Per-part YouTube videos | Built — nullable part ID = full ensemble; unique per part |
| Announcements: scheduling, pinning, priority, rich text | Built |
| Activity log | Built — written by triggers |
| App settings | Built — public/private split |

## Access levels

| Requirement | Status |
|---|---|
| Guests browse without an account | Built |
| Guest voice part persists in the browser | Built — `localStorage`, adopted on first sign-in |
| Singers save their voice part to their profile | Built |
| Admin dashboard, users, voice parts, settings, logs | Built — all nine pages |
| Email/password and Google sign-in | Built — Google needs console setup |
| Password reset | Built |

## Security

| Requirement | Status |
|---|---|
| RLS on every table | Built — 9/9, no `using (true)` on writes |
| No client-only security | Built — `isAdmin` documented as a UI hint |
| Roles not self-assignable | Built — separate table, no UPDATE policy |
| 10 security test scenarios | **Written, not run** — needs live user IDs |
| XSS prevention | Verified — 5/5 payloads neutralized in a smoke test |
| YouTube URL validation | Verified — 13/13 cases, hostile hosts rejected |

## Documentation

| Requirement | Status |
|---|---|
| README with full setup | Complete |
| Architecture notes | Complete — `docs/ARCHITECTURE.md` |
| Security notes | Complete — `docs/SECURITY.md` |
| Migrations and seed data | Complete — 6 migrations, 4 seed files |

## Known gaps

1. **The official DLL logo was not provided** — no file accompanied the brief. A placeholder sits at
   `public/logo.svg`; replace it there or upload via Admin → Settings.
2. **Nothing has been run against a live Supabase project.** Migrations, policies and the RLS test
   suite are written and internally consistent, but unexecuted.
3. **No automated test suite.** The two security-critical helpers were smoke-tested by hand. A real
   Vitest setup would be the first thing to add.
4. **Email confirmation and Google OAuth need dashboard configuration** — code is ready, credentials
   are not.
