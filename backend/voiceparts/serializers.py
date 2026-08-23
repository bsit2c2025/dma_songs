from rest_framework import serializers

from voiceparts.models import VoicePart


class VoicePartSerializer(serializers.ModelSerializer):
    class Meta:
        model = VoicePart
        fields = ["id", "name", "slug", "display_order"]
