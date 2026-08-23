import uuid

from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="Announcement",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("title", models.CharField(max_length=255)),
                ("subtitle", models.CharField(blank=True, max_length=255)),
                ("event_date", models.DateField()),
                ("event_time", models.TimeField()),
                ("venue", models.CharField(max_length=255)),
                ("description", models.TextField(blank=True)),
                ("hero_image_url", models.URLField(blank=True)),
                ("cta_text", models.CharField(blank=True, max_length=100)),
                ("published", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "db_table": "announcements",
                "ordering": ["-event_date"],
            },
        ),
    ]
