import uuid

from django.db import models


class VoicePart(models.Model):
    """
    A choir voice part (e.g. "Soprano 1"). Seeded with 8 defaults but fully
    admin-manageable — admins can add, rename, or remove parts via the
    dashboard rather than being limited to a hardcoded list.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=100, unique=True)
    display_order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "voice_parts"
        ordering = ["display_order", "name"]

    def __str__(self):
        return self.name
