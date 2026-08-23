from rest_framework import serializers

from categories.models import SongCategory


class SongCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = SongCategory
        fields = ["id", "name", "slug", "display_order"]
