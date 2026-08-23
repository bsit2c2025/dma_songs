# dma_songs — Music and Arts Song Management System

A song library and announcement board for **Dalubhasaan ng Lungsod ng Lucena — Music and Arts**.

Singers pick their voice part once and the library follows them around: every song page opens on
their own practice video, the card grid shows which parts each arrangement covers, and the home page
carries whatever the section leaders have posted. Administrators get a separate dashboard for songs,
announcements, members, voice parts, settings and an audit trail.

---

## Table of contents

1. [What it does](#what-it-does)
2. [Stack](#stack)
3. [Quick start](#quick-start)
4. [Supabase setup](#supabase-setup)
5. [Creating the first administrator](#creating-the-first-administrator)
6. [Environment variables](#environment-variables)
7. [Deploying to Vercel](#deploying-to-vercel)
8. [Project structure](#project-structure)
9. [Security model](#security-model)
10. [Testing the security rules](#testing-the-security-rules)
11. [Everyday tasks](#everyday-tasks)
12. [Troubleshooting](#troubleshooting)

---

## What it does

**Three levels of access.**

| | Guests | Singers | Administrators |
|---|---|---|---|
| Browse songs and videos | yes | yes | yes |
| Read announcements | yes | yes | yes |
| Pick a voice part | yes, stored in the browser | yes, saved to their account | yes |
| Edit their profile | — | yes | yes |
| Add or change content | — | — | yes |
| Manage members and roles | — | — | yes |
| See the activity log | — | — | yes |

Nobody has to sign in to use the library. An account exists so a singer's voice part travels between
their phone and their laptop, and so administrators have someone to hold accountable in the audit log.

**Eight voice parts**, seeded and editable: Soprano 2, Soprano 1, Alto 2, Alto 1, Tenor 2, Tenor 1,
Bass 2, Bass 1. Each carries a colour that flows through chips, tabs, dashboard bars and member lists.

**Per-part practice videos.** A song is assigned the parts it's arranged for, and each part can have
its own YouTube recording, plus an optional full-ensemble take. Only the eleven-character video ID is
stored, and the player doesn't load an iframe until someone presses play.

**Announcements** support rich text, an image, a call-to-action link, pinning, a 0–100 priority and a
start/end window. Scheduling is enforced by the database, not by the interface.

---

## Stack

- **React 18** + **TypeScript** (strict) + **Vite 6**
- **Tailwind CSS** with shadcn-style components built on **Radix UI** primitives
- **React Router 6**, **TanStack Query 5**, **React Hook Form** + **Zod**
- **Supabase** — Postgres, Auth, Row Level Security, Storage, RPC
- **DOMPurify** for rich-text sanitization, **lucide-react** for icons, **sonner** for toasts

---

## Quick start

Requires **Node 18.18+** (20 or 22 recommended) and a free Supabase project.

```bash
npm install
cp .env.example .env      # then fill in the two Supabase values
npm run dev               # http://localhost:5173
```

If the environment variables are missing you'll get a setup screen explaining exactly which ones,
rather than a mysterious 401 halfway through a page.

Other scripts:

```bash
npm run build       # type-check, then produce dist/
npm run preview     # serve the production build locally
npm run typecheck   # tsc only
```

---

## Supabase setup

### 1. Create the project

At [supabase.com](https://supabase.com), create a project and pick a region near Lucena
(Singapore is the closest). Keep the database password somewhere safe — you won't need it for this
app, but you will if you ever connect directly.

### 2. Run the migrations

Open **SQL Editor** in the Supabase dashboard and run these files **in order**, one at a time, from
`supabase/migrations/`:

| File | What it creates |
|---|---|
| `0001_init_schema.sql` | Tables, enums, constraints, indexes |
| `0002_functions_triggers.sql` | Helper functions, audit triggers, guards, dashboard stats |
| `0003_rls_policies.sql` | Row Level Security on every table |
| `0004_storage.sql` | Four storage buckets and their access rules |
| `0005_seed_reference_data.sql` | The eight voice parts and default settings |
| `0006_song_write_rpc.sql` | The transactional song-save function |

Each file is safe to re-run.

If you prefer the Supabase CLI:

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

### 3. Configure authentication

Under **Authentication → URL Configuration**:

- **Site URL** — `http://localhost:5173` for development, your Vercel URL in production
- **Redirect URLs** — add both `http://localhost:5173/auth/callback` and
  `https://your-domain.vercel.app/auth/callback`

Under **Authentication → Providers → Email**, decide whether to require email confirmation. Leaving
it on is the safer default; turning it off is friendlier if your singers use school addresses that
filter automated mail.

### 4. Google sign-in (optional but recommended)

Most students already have a Google account, which spares you a password-reset queue.

1. In [Google Cloud Console](https://console.cloud.google.com), create an OAuth 2.0 Client ID of type
   **Web application**.
2. Add this authorized redirect URI, taking the reference from your Supabase project URL:
   `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
3. Copy the client ID and secret into **Supabase → Authentication → Providers → Google** and enable it.

If you skip this, remove the Google button by deleting the `<GoogleButton />` usage in
`src/pages/Login.tsx`.

### 5. Storage

`0004_storage.sql` creates four buckets — `announcement-images`, `song-thumbnails`, `branding` and
`avatars`. All are publicly readable so images load without a signed request; writes are restricted
to administrators, except `avatars`, where a member may only write inside their own `<user-id>/`
folder.

### 6. Regenerate the database types (optional)

`src/types/database.ts` is hand-written to match the migrations. After you change the schema:

```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_REF > src/types/database.ts
```

---

## Creating the first administrator

**There is deliberately no way to make yourself an administrator from inside the app.** Every account
created through the sign-up form gets the `singer` role, and only an existing administrator can
promote anyone. The first one is created by hand.

1. Sign up normally through the app with the address that should own the account.
2. Open **SQL Editor** in Supabase, paste `supabase/seed/01_create_first_admin.sql`, replace the
   email placeholder with your address, and run it.
3. Sign out and back in. `/admin` is now reachable.

From then on, use **Admin → Members → Make administrator**. The database refuses to remove the last
remaining administrator, so you cannot lock yourself out.

---

## Environment variables

Copy `.env.example` to `.env`:

| Variable | Required | Notes |
|---|---|---|
| `VITE_SUPABASE_URL` | yes | Project Settings → API → Project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | yes | The **publishable / anon** key |
| `VITE_SITE_URL` | no | Used to build auth redirects; defaults to the current origin |

Everything prefixed with `VITE_` is compiled into the JavaScript bundle and is readable by anyone who
opens the site. That's fine for the anon key, which is designed to be public — Row Level Security is
what actually protects your data.

**Never put the `service_role` key in this file or anywhere else in the front end.** It bypasses RLS
entirely.

---

## Deploying to Vercel

1. Push the repository to GitHub.
2. In Vercel, **Add New → Project** and import it. The framework preset is detected as Vite;
   build command `npm run build`, output directory `dist`.
3. Add `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` and `VITE_SITE_URL` under
   **Settings → Environment Variables** for Production, Preview and Development.
4. Deploy, then go back to Supabase and add your production URL to **Site URL** and the
   `/auth/callback` path to **Redirect URLs**. Missing this step is the usual reason sign-in works
   locally but not in production.

`vercel.json` already handles the two things a single-page app needs on Vercel: rewriting all routes
to `index.html` so a refresh on `/songs/abc` doesn't 404, and a set of security headers
(`X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, a restrictive `Permissions-Policy`).

---

## Project structure

```
dma_songs/
├── public/                    logo.svg — replace with the official DLL mark
├── src/
│   ├── components/
│   │   ├── ui/                Radix-based primitives (button, dialog, select, …)
│   │   ├── common/            App-level pieces: SongCard, VoicePartSelector,
│   │   │                      YouTubeEmbed, RichTextEditor, ImageField, …
│   │   └── layout/            PublicLayout, AdminLayout, Logo
│   ├── features/
│   │   ├── auth/              AuthProvider + route guards
│   │   └── voice/             VoicePartProvider (localStorage ⇄ profile)
│   ├── hooks/                 TanStack Query wrappers, useDebouncedValue, …
│   ├── lib/                   supabase client, youtube parser, sanitizer,
│   │                          error mapping, query keys, utils
│   ├── pages/                 Public pages
│   │   └── admin/             Dashboard, songs, announcements, users,
│   │                          voice parts, settings, activity
│   ├── schemas/               Zod schemas — the single source of validation truth
│   ├── services/              Every Supabase call lives here, nowhere else
│   └── types/                 Database types + view models
├── supabase/
│   ├── migrations/            0001 … 0006, run in order
│   └── seed/                  First admin, demo content, RLS test suite
└── docs/                      Architecture and security notes
```

**Two conventions worth keeping.** Components never call Supabase directly — they call a hook, which
calls a service, which is the only layer that knows the client exists. And Zod schemas are shared
between the form and the service, so validation can't drift between what a form accepts and what gets
sent.

---

## Security model

The short version: **the browser is never trusted.** Hiding a button is a courtesy, not a control.
Every rule below is enforced by Postgres, and would still hold if someone threw away the front end
and talked to the REST API with `curl`.

- Row Level Security is enabled on all nine tables. No write policy anywhere uses `using (true)`.
- Roles live in `user_roles`, a table a singer cannot write to and which has **no UPDATE policy at
  all** — roles are granted or revoked, never edited in place.
- `profiles` has a trigger that freezes `id`, `email`, `is_active` and `created_at` for non-admins, so
  a singer editing their own row can change their name and voice part and nothing else.
- Admin checks run through `is_admin()`, a `SECURITY DEFINER` function, which keeps the policies from
  recursing into the table they're protecting.
- The activity log is written by database triggers, not by the client, so an administrator can't make
  a change quietly by bypassing the interface. The table has an admin-only SELECT policy, no write
  policy, and an explicit `revoke insert, update, delete` — nobody can forge or erase an entry.
- Deleting a voice part still in use is blocked by a trigger that names how many songs and members
  depend on it, rather than failing with a foreign-key error code.
- Announcement scheduling is a policy condition, not a filter in the query, so an unpublished or
  out-of-window post is invisible even to a hand-written request.
- Rich text is sanitized twice — once by Zod before it's saved, once at render — with an allowlist of
  tags and attributes. `style`, `script`, `iframe`, `form` and every `on*` handler are stripped.
- YouTube links are parsed against a host allowlist and reduced to the eleven-character ID. The embed
  URL is rebuilt by the app, so no administrator-supplied string ever reaches an `iframe src`.

`docs/SECURITY.md` goes through this in more detail, including why each decision was made.

---

## Testing the security rules

`supabase/seed/04_rls_test_suite.sql` impersonates an anonymous visitor, a signed-in singer and an
administrator inside a single transaction, and checks what each of them can actually reach. It covers
the scenarios in the brief: guest read access, singer write attempts, self-promotion, cross-profile
edits, disabled-song visibility, unpublished announcements and audit-log immutability.

To run it:

1. Create at least one singer account and one administrator account through the app.
2. Get their user IDs: `select id, email from auth.users;`
3. Paste the file into the SQL Editor, set the two IDs at the top, and run it.

The whole suite is wrapped in `begin … rollback`, so it leaves no trace. Every check raises a notice
saying which scenario passed; a failure aborts with a message naming the policy at fault.

**These tests have not been run against a live project** — that needs real user IDs, which only exist
once you've created your Supabase instance. Run them before you let anyone loose on the site.

---

## Everyday tasks

**Adding a song.** Admin → Songs → Add song. Title is the only required field. Tick the parts the
arrangement is written for, then add a video per part — the part dropdown only offers parts you've
ticked. Paste an ordinary YouTube link; the app extracts the ID. Songs default to active; toggle
"Show in the library" off to keep a piece in the database without exposing it.

**Taking something down.** Disable a song or unpublish an announcement rather than deleting it. The
material is kept and can come back with one click. Deleting is permanent and asks you to type the
song's title first.

**Scheduling an announcement.** Set "Show from" and "Hide after". Between those times it's live;
outside them the database won't return it. Pinning lifts a post above everything else; priority
orders the rest.

**Changing the branding.** Admin → Settings. The application name, tagline, organization, contact
email and logo all live in the database, so no redeploy is needed. Upload the logo there or drop the
file at `public/logo.svg`.

**Adding a voice part.** Admin → Voice parts. Order controls where it appears everywhere; colour
flows into chips, tabs and dashboard bars. Hiding a part removes it from the picker without touching
the songs assigned to it.

---

## Troubleshooting

**"Finish the setup" screen.** `.env` is missing or still contains the placeholder values. Fill it in
and restart the dev server — Vite only reads `.env` at startup.

**Sign-in redirects to a blank page or an error.** The callback URL isn't registered. Add
`<your-origin>/auth/callback` under Supabase → Authentication → URL Configuration → Redirect URLs.

**`/admin` bounces to "not authorized".** The account has the `singer` role. Promote it from
Admin → Members with another administrator account, or run the first-admin SQL.

**"Could not find a relationship between …".** A migration didn't finish. Re-run `0001` and `0002` in
order; both are idempotent.

**Images upload but don't appear.** Check the bucket exists and is public under Supabase → Storage. A
failed `0004_storage.sql` is the usual cause.

**Row Level Security errors when saving.** Confirm you're signed in as an administrator and that
`0003_rls_policies.sql` ran. `select public.is_admin(auth.uid());` in the SQL editor tells you what
the database thinks of your account.

---

## Licence and credits

Built for Dalubhasaan ng Lungsod ng Lucena — Music and Arts. The logo and all musical content belong
to the institution.
