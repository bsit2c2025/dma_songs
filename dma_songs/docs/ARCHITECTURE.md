# Architecture

This document explains how the pieces fit together and, more usefully, why several of them are shaped
the way they are. If you only read one section, read [Decisions](#decisions).

---

## Shape of the system

```
Browser (React SPA, static files on Vercel)
   │
   │  supabase-js over HTTPS — always as the signed-in user or as anon
   ▼
Supabase
   ├── Auth ............ sessions, Google OAuth, password reset
   ├── PostgREST ....... auto-generated REST over the tables
   ├── Postgres ........ tables, RLS policies, triggers, RPC functions
   └── Storage ......... four buckets, policy-controlled
```

There is no server of our own. That's a deliberate constraint: with no backend to hide logic in,
every rule has to live in the database, which is the one place that can't be bypassed. A choir isn't
going to maintain a Node service, and an unmaintained one is worse than none.

---

## Data model

Nine tables.

```
auth.users (Supabase-managed)
    │ 1:1
    ▼
profiles ──────────────► voice_classifications ◄──────────┐
    │  voice_classification_id                            │
    │ 1:many                                              │
    ▼                                                     │
user_roles                                                │
                                                          │
songs ──────────► song_voice_classifications ─────────────┤
    │              (junction, many-to-many)               │
    │ 1:many                                              │
    ▼                                                     │
song_videos ──────────────────────────────────────────────┘
    (voice_classification_id is nullable = full-ensemble take)

announcements      activity_logs      app_settings
```

**`voice_classifications`** — the eight parts, each with a name, slug, short code, colour, sort order
and active flag. Reference data, but editable, because a choir might add a descant line or drop a
division.

**`profiles`** — one row per account, created automatically by a trigger on `auth.users`. Holds the
display name, email, avatar, chosen voice part and an active flag. Notably it does **not** hold a
role.

**`user_roles`** — `(user_id, role)` as the primary key, so a user can hold more than one role and
can't hold the same one twice. `user_id` references `public.profiles`, not `auth.users`, for two
reasons: PostgREST can then embed roles when listing members, and deleting a profile takes its role
assignments with it.

**`songs`** — title plus optional composer, arranger, description, category, lyrics, rehearsal notes
and thumbnail. `status` is an enum, `active` or `disabled`. Authorship columns are stamped by trigger.

**`song_voice_classifications`** — the many-to-many junction. `on delete restrict` against the voice
part, so a part in use can't vanish under a song.

**`song_videos`** — one row per video. `voice_classification_id` nullable, where null means "the whole
ensemble". A unique index on `(song_id, coalesce(voice_classification_id, '000…0'))` enforces one
video per part per song, including one general video. Stores the eleven-character YouTube ID with a
`^[A-Za-z0-9_-]{11}$` check constraint, alongside the original URL for reference.

**`announcements`** — title, sanitized HTML content, optional image and link, publish and pin flags,
a 0–100 priority, and a `starts_at`/`ends_at` window with a check that the end follows the start.

**`activity_logs`** — actor, action, resource type/ID/label, and a JSONB metadata blob. Append-only
by construction (see [Decisions](#decisions)).

**`app_settings`** — key/value JSONB with an `is_public` flag, so branding can be read by anyone while
operational settings stay admin-only.

---

## Front end

```
main.tsx           environment check → SetupNotice or App
  └── App.tsx      QueryClient → Router → AuthProvider → VoicePartProvider → routes
```

**Layers, strictly.** A component calls a hook; a hook calls a service; a service is the only thing
that imports the Supabase client. This isn't ceremony — it means that when a query changes shape,
there's exactly one file to open, and a component can't quietly grow its own database access.

**Zod schemas are shared** between the form resolver and the service that submits. One definition
governs both what a form accepts and what gets sent, so the two can't drift apart.

**Route splitting is drawn along the access line.** Public pages are eager; everything under `/admin`
is lazy. A guest browsing songs never downloads the dashboard.

**Two contexts.** `AuthProvider` owns session, profile and roles. `VoicePartProvider` owns the chosen
part — in `localStorage` for guests, on the profile for members, with the guest choice adopted on
first sign-in so nobody has to pick twice.

---

## Decisions

### Roles in a separate table

A singer can update their own `profiles` row — that's how they change their display name. If `role`
were a column on that row, the only thing standing between a singer and an admin account would be a
correctly written `with check` clause. One mistake, one migration that drops and recreates a policy,
and the whole authorization model is gone.

Putting roles in their own table means the dangerous operation lives somewhere a singer has no write
access at all. `user_roles` has an admin-only INSERT policy, an admin-only DELETE policy, and **no
UPDATE policy whatsoever** — roles are granted or revoked, never edited. A trigger blocks removing the
last remaining administrator and stamps who granted what.

### `is_admin()` as SECURITY DEFINER

The obvious policy — "you may read `user_roles` if you're an admin" — needs to read `user_roles` to
decide, which re-triggers the policy. Postgres either errors or the policy silently fails.
`is_admin()` runs as its owner with a pinned `search_path`, reads the table directly, and returns a
boolean. Policies call the function instead of querying the table.

### Audit logging in triggers, not the client

Client-side logging has an obvious hole: anyone who can write to the table can write to it *without*
the logging code, because the log is just another API call they control. Triggers close it. Any change
to songs, announcements, roles, profiles or settings is logged by the database as part of the same
transaction.

The log is then made append-only from the outside: an admin-only SELECT policy, no INSERT/UPDATE/
DELETE policy, and an explicit `revoke insert, update, delete on activity_logs from anon,
authenticated`. Writes only happen through `write_activity_log()`, a SECURITY DEFINER function whose
EXECUTE permission is revoked from clients. So even a compromised administrator account cannot forge
an entry or erase its own tracks through the API.

### One transactional RPC for song writes

Saving a song touches three tables: the song, its parts, its videos. Done as three REST calls from a
browser, a dropped connection between the second and the third leaves a song with parts but no videos
— or worse, a song whose parts no longer match its videos.

`admin_save_song(jsonb)` takes the whole payload and does it in one transaction. It re-checks
`is_admin()` itself rather than relying on the caller, and raises if the result would be a song with
zero voice parts.

Within it, the video delete and insert are **separate statements**. Written as one data-modifying CTE,
the insert would still see rows the delete hasn't committed, and moving a video from Tenor 1 to
Tenor 2 would collide with the unique index.

### Storing the video ID, not the URL

An administrator pastes arbitrary text into a field, and that text eventually becomes an `iframe src`.
That's a direct path from "trusted user makes a typo" to "trusted user gets phished into pasting
something else". So the URL is parsed against a host allowlist (`youtube.com`, `youtu.be`,
`m.youtube.com`, `music.youtube.com`), reduced to eleven characters matching
`^[A-Za-z0-9_-]{11}$`, and stored as an ID with a matching check constraint in the database. The embed
URL is then constructed by the app from that ID, pointing at `youtube-nocookie.com`. No
administrator-supplied string ever reaches the DOM as a URL.

The player also doesn't mount an iframe until someone presses play — better for privacy, and much
better on a page with eight videos on a school connection.

### Sanitizing twice

Once in the Zod schema, so what lands in the database is already clean; once at render, so anything
already in the database from before, or written by a future integration, still can't execute. The
allowlist is narrow: formatting tags, lists, headings, links, and `href`/`target`/`rel`/`title`.
`style`, `script`, `iframe`, `form`, `object`, `embed` and every `on*` attribute are stripped. A hook
forces `rel="noopener noreferrer"` on links that open in a new tab.

### Dual embed for voice-part filtering

Filtering songs by voice part through a single embedded junction table gives you the wrong answer:
`!inner` plus a filter narrows the *embedded rows too*, so a song that covers four parts appears to
cover only the one you filtered by. The query therefore embeds the junction twice — an aliased
`!inner` copy that does the filtering, and a plain copy that returns every part for display.

### `admin_dashboard_stats()` as one call

The dashboard wants eleven numbers across five tables. As separate queries that's eleven round trips
on a page load. As one RPC returning JSONB it's one, and the aggregation happens where the data lives.

### Client-side `isAdmin` is a hint

`AuthProvider` exposes `isAdmin` and the routes use it. This is a **user-experience affordance only** —
it decides whether to show a dashboard link or a "not authorized" page. It is not a security control,
and the code says so in a comment where it's defined. If it were bypassed entirely, every request the
resulting pages made would still be refused by RLS.

---

## Performance notes

- **Indexes** on the columns actually filtered: song status, junction keys, announcement publication
  (as a partial index over published rows only), activity log timestamp, profile voice part.
- **A GIN trigram index** on `songs.title`, so `ilike '%query%'` — which can't use a normal B-tree —
  stays fast as the library grows.
- **Pagination everywhere**, with exact counts, never a full table fetch.
- **Manual chunking** in the Vite config splits React, Supabase, TanStack Query and Radix into
  separate vendor chunks so an app-code change doesn't invalidate all of them.
- **Search is debounced** at 300ms and reflected in the URL, so a filtered view can be shared.

---

## Deliberate non-goals

**No offline mode.** It would mean a local mirror of the library and conflict resolution on top,
which is a large amount of machinery for a use case — practising at home — that generally has wi-fi.

**No file uploads for audio.** Videos live on YouTube. Hosting audio means storage costs, transcoding,
and a copyright conversation the institution should have deliberately rather than by accident.

**No email notifications.** Announcements are pull, not push. Adding email means deliverability,
unsubscribe handling and a sending domain — worth doing later, on purpose, not as a side effect.

**No soft deletes on songs.** Disabling covers the "take it down for now" case. A `deleted_at` column
on top would mean every query carries a filter that someone will eventually forget.
