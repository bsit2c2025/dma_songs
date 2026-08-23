import uuid

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("categories", "0001_initial"),
        ("voiceparts", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="Song",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("title", models.CharField(max_length=255)),
                ("composer", models.CharField(blank=True, max_length=255)),
                ("description", models.TextField(blank=True)),
                ("notes", models.TextField(blank=True)),
                (
                    "note_type",
                    models.CharField(
                        blank=True,
                        choices=[
                            ("recited", "Recited"),
                            ("instrumental", "Instrumental"),
                            ("descant", "Descant"),
                            ("other", "Other"),
                        ],
                        max_length=20,
                    ),
                ),
                ("youtube_url", models.URLField(blank=True)),
                ("music_sheet_url", models.URLField(blank=True)),
                ("music_sheet_file_url", models.URLField(blank=True)),
                ("published", models.BooleanField(default=False)),
                ("display_order", models.IntegerField(default=0)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "category",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="songs",
                        to="categories.songcategory",
                    ),
                ),
            ],
            options={
                "db_table": "songs",
                "ordering": ["display_order", "title"],
            },
        ),
        migrations.CreateModel(
            name="SongVoicePart",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("song", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to="songs.song")),
                (
                    "voice_part",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to="voiceparts.voicepart"),
                ),
            ],
            options={
                "db_table": "song_voice_parts",
            },
        ),
        migrations.AddField(
            model_name="song",
            name="voice_parts",
            field=models.ManyToManyField(
                blank=True, related_name="songs", through="songs.SongVoicePart", to="voiceparts.voicepart"
            ),
        ),
        migrations.AddConstraint(
            model_name="songvoicepart",
            constraint=models.UniqueConstraint(fields=("song", "voice_part"), name="unique_song_voice_part"),
        ),
    ]
