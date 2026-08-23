"""
Creates the single admin account end-to-end: registers the user with
Supabase Auth (via the Admin API, using the service-role key) and creates
the matching `profiles` row with role='admin'.

Usage:
    python manage.py create_admin --email admin@example.com --password 'a-strong-password'
"""

import requests
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from users.models import Profile


class Command(BaseCommand):
    help = "Creates a Supabase Auth user and a matching admin profile row."

    def add_arguments(self, parser):
        parser.add_argument("--email", required=True)
        parser.add_argument("--password", required=True)

    def handle(self, *args, **options):
        email = options["email"]
        password = options["password"]

        response = requests.post(
            f"{settings.SUPABASE_URL}/auth/v1/admin/users",
            headers={
                "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
                "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
                "Content-Type": "application/json",
            },
            json={"email": email, "password": password, "email_confirm": True},
            timeout=10,
        )

        if response.status_code >= 400:
            raise CommandError(f"Supabase Auth rejected the request: {response.text}")

        user_id = response.json().get("id")
        if not user_id:
            raise CommandError(f"Unexpected response from Supabase Auth: {response.text}")

        profile, created = Profile.objects.update_or_create(
            id=user_id, defaults={"email": email, "role": "admin"}
        )

        self.stdout.write(
            self.style.SUCCESS(
                f"{'Created' if created else 'Updated'} admin profile for {profile.email} ({profile.id})"
            )
        )
