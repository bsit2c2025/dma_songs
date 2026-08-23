# DMA Choir Portal — Frontend

React + Vite frontend for the Choir / Music Ministry Portal. Talks to the Django REST
API for all data; talks to Supabase Auth directly only for login/session.

## Stack

- React + Vite
- React Router (`react-router-dom`)
- Tailwind CSS
- `@supabase/supabase-js` (auth only — never queries Postgres directly)
- `axios` (all data reads/writes go through the Django API)

## 1. Configure environment variables

Copy `.env.example` to `.env` and fill in:

```
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key, from Supabase Project Settings -> API>
VITE_API_BASE_URL=http://localhost:8000/api   # or your deployed Render URL + /api
```

Get the Supabase URL/anon key from the same Supabase project the backend's
`DATABASE_URL` / `SUPABASE_*` env vars point to (see `backend/README.md` for full
Supabase project setup — create project, enable email auth, etc).

## 2. Install & run

```bash
npm install
npm run dev
```

Runs at `http://localhost:5173` by default. Make sure the backend is running (or
deployed) at whatever `VITE_API_BASE_URL` points to, and that its
`CORS_ALLOWED_ORIGINS` includes `http://localhost:5173`.

## 3. Add the logo

`dma-logo.jpg` was not included in this handoff. Drop the real logo file at:

```
src/assets/dma-logo.jpg
```

and swap it into `src/components/layout/Navbar.jsx` (currently renders a plain
monochrome "DMA" text mark as a placeholder in the `LogoMark` component).

## 4. Project structure

```
src/
  api/            One module per backend resource (songs, announcements, voice-parts,
                   categories, users, storage, dashboard). All requests go through
                   api/client.js, which attaches the Supabase access token and
                   normalizes error messages from Django's { error: { message } } shape.
  services/
    supabaseClient.js   Supabase client — auth only.
  context/
    AuthContext.jsx     Session + profile (GET /api/users/me/) + isAdmin.
    VoiceContext.jsx     Selected voice part (localStorage; synced to profile if logged in).
  hooks/           useVoiceParts, useCategories, useDebouncedValue.
  components/
    layout/        Navbar, Footer, PageHeader.
    music/          VoicePartSelector, CategoryFilter, SearchBar, SongCard, SongList.
    admin/          AdminSidebar, DataTable, ConfirmDeleteButton, SongForm.
    common/         Button, TextField, TextArea, Select, Modal, Spinner, Badge,
                     ErrorMessage, EmptyState.
  layouts/          PublicLayout (Navbar/Footer + Outlet), AdminLayout (+ sidebar).
  routes/
    ProtectedRoute.jsx   Redirects to /login unless session exists and profile.role
                          is 'admin'.
  pages/            Home, Music, SongDetail, Login, NotFound.
  pages/admin/      Dashboard, AnnouncementAdmin, SongsAdmin, VoicePartsAdmin,
                     CategoriesAdmin, UsersAdmin.
```

## 5. How auth works

1. React signs in against Supabase Auth directly (`supabase.auth.signInWithPassword`)
   in `AuthContext.login`.
2. The resulting Supabase session access token is attached as
   `Authorization: Bearer <token>` on every Django API request (see `api/client.js`).
3. Django verifies the token and loads `profiles.role` (see backend
   `core/authentication.py`) — the frontend never decides admin status itself, it
   just reads `profile.role` back from `GET /api/users/me/`.
4. `ProtectedRoute` gates every `/admin/*` route on `isAuthenticated && isAdmin`.

There is no self-serve signup UI — admin accounts are created via the backend's
`create_admin` management command (see backend README), matching the "single admin,
no self-serve promotion" decision in `CLAUDE.md`.

## 6. File uploads (music sheets)

`SongForm` uploads sheet music directly to Supabase Storage:

1. `POST /api/storage/signed-upload-url/` (Django, admin-only) validates file
   type/size and returns `{ signed_url, path, public_url }`.
2. The browser `PUT`s the raw file to `signed_url` directly (bypassing Django).
3. `public_url` is saved into the song's `music_sheet_file_url` field on submit.

## 7. Known gaps / next steps (Phase 4+)

- Supabase project itself is not yet created — see backend README section on
  Supabase setup. Until `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` point at a real
  project, login will fail (public pages work fine, since they don't need auth).
- Drag-and-drop reordering was implemented as simple up/down buttons calling
  `POST /api/songs/reorder/` — swap in a drag library later if desired.
- No toast/notification system — errors surface inline near the relevant form/table.
- No automated tests yet (Phase 5).
- Real logo asset still needs to be dropped in (see section 3 above).
