from datetime import date, time

from django.core.management.base import BaseCommand
from django.db import transaction

from announcements.models import Announcement
from categories.models import SongCategory
from songs.models import Song
from voiceparts.models import VoicePart

VOICE_PARTS = [
    ("Soprano 1", "soprano-1"),
    ("Soprano 2", "soprano-2"),
    ("Alto 1", "alto-1"),
    ("Alto 2", "alto-2"),
    ("Tenor 1", "tenor-1"),
    ("Tenor 2", "tenor-2"),
    ("Bass 1", "bass-1"),
    ("Bass 2", "bass-2"),
]

CATEGORIES = [
    "Entrance",
    "Kyrie",
    "Alleluia",
    "Preparation of Gifts",
    "Holy",
    "Memorial Acclamation",
    "Amen",
    "Lord's Prayer",
    "Doxology",
    "Lamb of God",
    "Communion",
    "Recessional",
]

# (title, composer, category name, note_type, notes, display_order)
SONGS = [
    ("BLESS THE LORD", "", "Entrance", "", "", 1),
    ("Kyrie Eleison", "", "Kyrie", "recited", "Recited", 2),
    ("ALLELUIA", "Fr. Manuel V. Francisco, SJ", "Alleluia", "", "", 3),
    ("TAKE OUR BREAD", "", "Preparation of Gifts", "instrumental", "Instrumental", 4),
    ("Holy", "Fr. M. Francisco, SJ", "Holy", "", "", 5),
    ("When We Eat This Bread", "Fr. M. Francisco, SJ", "Memorial Acclamation", "", "", 6),
    ("Great Amen", "", "Amen", "other", "If recited by the presider", 7),
    ("The Lord's Prayer", "Fr. M. Francisco, SJ", "Lord's Prayer", "", "", 8),
    ("Doxology to the Lord's Prayer", "Fr. M. Francisco, SJ", "Doxology", "", "", 9),
    ("Lamb of God", "", "Lamb of God", "recited", "Recited", 10),
    ("HOLY SPIRIT COME TO US", "", "Communion", "descant", "With descant", 11),
    ("MAGNIFICAT ANIMA MEA DOMINUM", "", "Recessional", "", "", 12),
]


class Command(BaseCommand):
    help = "Seeds voice parts, song categories, the initial event announcement, and songs."

    @transaction.atomic
    def handle(self, *args, **options):
        for name, slug in VOICE_PARTS:
            obj, created = VoicePart.objects.get_or_create(
                slug=slug, defaults={"name": name, "display_order": VOICE_PARTS.index((name, slug))}
            )
            self.stdout.write(f"{'Created' if created else 'Exists '} voice part: {obj.name}")

        category_objs = {}
        for index, name in enumerate(CATEGORIES):
            slug = name.lower().replace("'", "").replace(" ", "-")
            obj, created = SongCategory.objects.get_or_create(
                slug=slug, defaults={"name": name, "display_order": index}
            )
            category_objs[name] = obj
            self.stdout.write(f"{'Created' if created else 'Exists '} category: {obj.name}")

        announcement, created = Announcement.objects.get_or_create(
            title="YOUNG ADULTS MASS",
            defaults={
                "subtitle": "Prepare. Practice. Sing together.",
                "event_date": date(2026, 9, 5),
                "event_time": time(17, 0),
                "venue": "Pacific Event Theater",
                "cta_text": "VIEW MUSIC",
                "published": True,
            },
        )
        self.stdout.write(f"{'Created' if created else 'Exists '} announcement: {announcement.title}")

        for title, composer, category_name, note_type, notes, display_order in SONGS:
            obj, created = Song.objects.get_or_create(
                title=title,
                defaults={
                    "composer": composer,
                    "category": category_objs[category_name],
                    "note_type": note_type,
                    "notes": notes,
                    "display_order": display_order,
                    "published": False,
                },
            )
            self.stdout.write(f"{'Created' if created else 'Exists '} song: {obj.title}")

        self.stdout.write(self.style.SUCCESS("Seed complete."))
