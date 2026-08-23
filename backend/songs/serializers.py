from rest_framework import serializers

from categories.models import SongCategory
from categories.serializers import SongCategorySerializer
from songs.models import Song, SongVoicePart
from voiceparts.models import VoicePart
from voiceparts.serializers import VoicePartSerializer


class SongSerializer(serializers.ModelSerializer):
    """Read representation — nests category and voice parts for display."""

    category = SongCategorySerializer(read_only=True)
    voice_parts = VoicePartSerializer(many=True, read_only=True)

    class Meta:
        model = Song
        fields = [
            "id",
            "title",
            "composer",
            "category",
            "description",
            "notes",
            "note_type",
            "youtube_url",
            "music_sheet_url",
            "music_sheet_file_url",
            "published",
            "display_order",
            "voice_parts",
            "created_at",
            "updated_at",
        ]


class SongDetailSerializer(SongSerializer):
    """Adds a handful of related songs (same category, published, excluding self)."""

    related_songs = serializers.SerializerMethodField()

    class Meta(SongSerializer.Meta):
        fields = SongSerializer.Meta.fields + ["related_songs"]

    def get_related_songs(self, obj):
        related = (
            Song.objects.filter(category=obj.category, published=True)
            .exclude(id=obj.id)
            .order_by("display_order")[:4]
        )
        return SongSerializer(related, many=True).data


class SongWriteSerializer(serializers.ModelSerializer):
    """
    Create/update representation. Accepts `category_id` and a list of
    `voice_part_ids` rather than nested objects, matching how the admin
    song form's multi-select posts data.
    """

    category_id = serializers.PrimaryKeyRelatedField(
        source="category", queryset=SongCategory.objects.all()
    )
    voice_part_ids = serializers.PrimaryKeyRelatedField(
        source="voice_parts", queryset=VoicePart.objects.all(), many=True, required=False
    )

    class Meta:
        model = Song
        fields = [
            "id",
            "title",
            "composer",
            "category_id",
            "description",
            "notes",
            "note_type",
            "youtube_url",
            "music_sheet_url",
            "music_sheet_file_url",
            "published",
            "display_order",
            "voice_part_ids",
        ]
        read_only_fields = ["id"]

    def create(self, validated_data):
        voice_parts = validated_data.pop("voice_parts", [])
        song = Song.objects.create(**validated_data)
        if voice_parts:
            song.voice_parts.set(voice_parts)
        return song

    def update(self, instance, validated_data):
        voice_parts = validated_data.pop("voice_parts", None)
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()
        if voice_parts is not None:
            instance.voice_parts.set(voice_parts)
        return instance

    def to_representation(self, instance):
        # Return the richer nested shape after a write, so the frontend
        # doesn't need a second request to refresh the card it just edited.
        return SongSerializer(instance).data
