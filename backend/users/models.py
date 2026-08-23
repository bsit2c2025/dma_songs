import uuid

from django.db import models

from voiceparts.models import VoicePart


class Profile(models.Model):
    """
    Mirrors a Supabase Auth user (auth.users). `id` matches the Supabase
    auth.users.id exactly — rows are created either by the create_admin
    management command (see seed/management/commands/create_admin.py) or by
    the frontend calling PATCH /api/users/me/ the first time a newly
    signed-up user is seen (see users/views.py).

    A real foreign-key constraint to auth.users(id) is added in migration
    0002 via raw SQL, since auth.users lives in Supabase's own `auth` schema
    within the same Postgres database.
    """

    ROLE_CHOICES = [
        ("user", "User"),
        ("admin", "Admin"),
    ]

    id = models.UUIDField(primary_key=True, editable=False)
    email = models.EmailField()
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="user")
    voice_part = models.ForeignKey(
        VoicePart, on_delete=models.SET_NULL, null=True, blank=True, related_name="profile"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "profiles"
        ordering = ["-created_at"]

    def __str__(self):
        return self.email
