import uuid

from django.db import models, transaction


class Announcement(models.Model):
    """
    An event announcement. At most one row has published=True at any time —
    that row is what the public hero section renders. Saving a row with
    published=True automatically unpublishes every other row, so the admin
    never has to remember to do it manually.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    subtitle = models.CharField(max_length=255, blank=True)
    event_date = models.DateField()
    event_time = models.TimeField()
    venue = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    hero_image_url = models.URLField(blank=True)
    cta_text = models.CharField(max_length=100, blank=True)
    published = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "announcements"
        ordering = ["-event_date"]

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        with transaction.atomic():
            if self.published:
                Announcement.objects.exclude(pk=self.pk).update(published=False)
            super().save(*args, **kwargs)
