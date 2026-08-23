from rest_framework import serializers

from users.models import Profile
from voiceparts.serializers import VoicePartSerializer


class ProfileSerializer(serializers.ModelSerializer):
    """Full representation — used for the admin user list."""

    voice_part = VoicePartSerializer(read_only=True)

    class Meta:
        model = Profile
        fields = ["id", "email", "role", "voice_part", "created_at", "updated_at"]
        read_only_fields = ["id", "email", "created_at", "updated_at"]


class ProfileAdminUpdateSerializer(serializers.ModelSerializer):
    """Used by admins to change another user's role/voice part."""

    class Meta:
        model = Profile
        fields = ["role", "voice_part"]


class ProfileSelfUpdateSerializer(serializers.ModelSerializer):
    """
    Used by a logged-in user updating their own profile. Deliberately
    excludes `role` — a user can never grant themselves admin through this
    endpoint.
    """

    class Meta:
        model = Profile
        fields = ["voice_part"]
