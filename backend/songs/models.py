import uuid

from django.db import models

from categories.models import SongCategory
from voiceparts.models import VoicePart


class Song(models.Model):
    NOTE_TYPE_CHOICES = [
        ("recited", "Recited"),
        ("instrumental", "Instrumental"),
        ("descant", "Descant"),
        ("other", "Other"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    composer = models.CharField(max_length=255, blank=True)
    category = models.ForeignKey(SongCategory, on_delete=models.PROTECT, related_name="songs")
    description = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    note_type = models.CharField(max_length=20, choices=NOTE_TYPE_CHOICES, blank=True)
    youtube_url = models.URLField(blank=True)
    music_sheet_url = models.URLField(blank=True)
    music_sheet_file_url = models.URLField(blank=True)
    published = models.BooleanField(default=False)
    display_order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    voice_parts = models.ManyToManyField(
        VoicePart, through="SongVoicePart", related_name="songs", blank=True
    )

    class Meta:
        db_table = "songs"
        ordering = ["display_order", "title"]

    def __str__(self):
        return self.title


class SongVoicePart(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    song = models.ForeignKey(Song, on_delete=models.CASCADE)
    voice_part = models.ForeignKey(VoicePart, on_delete=models.CASCADE)

    class Meta:
        db_table = "song_voice_parts"
        constraints = [
            models.UniqueConstraint(fields=["song", "voice_part"], name="unique_song_voice_part")
        ]
