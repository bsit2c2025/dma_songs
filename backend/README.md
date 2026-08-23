# Backend — Choir Music Ministry Portal (Django REST API)

Django REST Framework API that sits between the React frontend and Supabase
PostgreSQL. See `/CLAUDE.md` at the project root for full architecture notes.

## 1. Prerequisites

- Python 3.11+
- A Supabase project (see section 2 if you haven't created one yet)

## 2. Create the Supabase project

1. Go to https://supabase.com/dashboard and create a new project.
2. Wait for provisioning, then go to **Project Settings → Database** and copy
   the **connection string** under "Connection pooling" (Session mode). This
   is your `DATABASE_URL`.
3. Go to **Project Settings → API** and copy:
   - **Project URL** → `SUPABASE_URL`
   - **anon public key** → `SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (keep this secret —
     never send it to the frontend)
4. Go to **Project Settings → API → JWT Settings** and copy the **JWT
   Secret** → `SUPABASE_JWT_SECRET`.
5. Go to **Authentication → Providers** and confirm **Email** is enabled
   (it is by default).
6. Go to **Storage** and create two buckets:
   - `music-sheets` (public)
   - `hero-images` (public)

## 3. Install dependencies

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

## 4. Configure environment variables

```bash
cp .env.example .env
```

Fill in every value in `.env` using what you collected in step 2. Generate a
`DJANGO_SECRET_KEY` with:

```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

## 5. Run migrations

This creates every table described in `/CLAUDE.md` (section 4) directly in
your Supabase Postgres database, including the real foreign-key constraint
from `profiles.id` to Supabase's `auth.users.id`.

```bash
python manage.py migrate
```

## 6. Seed initial data

Creates the 8 voice parts, 12 song categories, the "Young Adults Mass"
announcement, and all 12 initial songs (unassigned to any voice part, with
empty YouTube/sheet links — fill those in from the admin dashboard once
Phase 3 is built).

```bash
python manage.py seed_data
```

## 7. Create the admin account

Creates a real Supabase Auth user **and** the matching `profiles` row with
`role='admin'` in one step:

```bash
python manage.py create_admin --email you@example.com --password 'a-strong-password'
```

## 8. Run the server

```bash
python manage.py runserver
```

API is now available at `http://localhost:8000/api/`. Try:

```bash
curl http://localhost:8000/api/announcements/current/
curl http://localhost:8000/api/voice-parts/
curl http://localhost:8000/api/songs/
```

## 9. Deploying to Render

1. Push this repo to GitHub.
2. In Render, create a new **Web Service** pointing at the `backend/`
   directory.
3. Build command: `pip install -r requirements.txt`
4. Start command is read from the included `Procfile` (`gunicorn
   config.wsgi`), and `release: python manage.py migrate` runs automatically
   on each deploy.
5. Add every variable from `.env.example` as a Render environment variable
   (with real values). Set `DJANGO_ALLOWED_HOSTS` to your Render domain and
   `CORS_ALLOWED_ORIGINS` to your Vercel frontend URL.
6. After the first deploy, run the seed and create-admin commands from
   Render's shell tab (or locally against the same `DATABASE_URL`).

## App layout

```
config/          settings, root urls, wsgi/asgi
core/            Supabase JWT auth, permissions, pagination, error handling, dashboard summary
announcements/   event/announcement model + API
songs/           song model, junction table, filtering, reorder/duplicate logic
voiceparts/      admin-manageable voice parts
categories/      admin-manageable song categories
users/           profiles (mirrors Supabase auth.users), self-service /me endpoint
storage/         signed Supabase Storage upload URLs
seed/            seed_data and create_admin management commands
```

## Notes

- Django never stores its own passwords for these users — `SupabaseJWTAuthentication`
  (`core/authentication.py`) verifies the JWT Supabase already issued.
- Row Level Security (RLS) policies for Supabase are covered separately in
  Phase 4 — they're a defense-in-depth layer behind Django's own
  authorization, not yet created by this phase.
