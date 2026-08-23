from rest_framework import serializers

from announcements.models import Announcement


class AnnouncementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Announcement
        fields = [
            "id",
            "title",
            "subtitle",
            "event_date",
            "event_time",
            "venue",
            "description",
            "hero_image_url",
            "cta_text",
            "published",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
