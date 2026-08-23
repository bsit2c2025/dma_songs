import uuid

from django.db import models


class SongCategory(models.Model):
    """
    A liturgical/song category (e.g. "Entrance", "Kyrie"). Seeded with the 12
    categories from the original song list but admins can add more later
    without a code deploy — this is a real lookup table, not a fixed enum.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=100, unique=True)
    display_order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "song_categories"
        ordering = ["display_order", "name"]
        verbose_name_plural = "song categories"

    def __str__(self):
        return self.name
