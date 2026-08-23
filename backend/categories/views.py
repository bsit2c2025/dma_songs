from rest_framework import viewsets

from categories.models import SongCategory
from categories.serializers import SongCategorySerializer
from core.permissions import IsAdmin


class SongCategoryViewSet(viewsets.ModelViewSet):
    queryset = SongCategory.objects.all()
    serializer_class = SongCategorySerializer
    pagination_class = None

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return []
        return [IsAdmin()]
