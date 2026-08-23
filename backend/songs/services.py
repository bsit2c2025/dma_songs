import uuid

from django.db import transaction

from songs.models import Song


def reorder_songs(ordered_ids):
    """
    Given a list of song ids in the desired display order, updates
    display_order for all of them atomically. Raises ValueError if any id
    doesn't exist.
    """
    songs = list(Song.objects.filter(id__in=ordered_ids))
    if len(songs) != len(ordered_ids):
        raise ValueError("One or more song ids were not found.")

    songs_by_id = {str(song.id): song for song in songs}
    with transaction.atomic():
        for index, song_id in enumerate(ordered_ids):
            song = songs_by_id[str(song_id)]
            song.display_order = index
            song.save(update_fields=["display_order"])


def duplicate_song(song):
    """
    Creates a copy of `song` (new id, title suffixed with "(Copy)",
    unpublished by default so the admin reviews it before it goes live) with
    the same voice-part assignments.
    """
    with transaction.atomic():
        original_voice_parts = list(song.voice_parts.all())
        song.pk = None
        song.id = uuid.uuid4()
        song.title = f"{song.title} (Copy)"
        song.published = False
        song.save()
        if original_voice_parts:
            song.voice_parts.set(original_voice_parts)
    return song
