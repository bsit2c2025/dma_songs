from rest_framework import viewsets
from rest_framework.pagination import PageNumberPagination

from core.permissions import IsAdmin
from voiceparts.models import VoicePart
from voiceparts.serializers import VoicePartSerializer


class VoicePartViewSet(viewsets.ModelViewSet):
    """
    Public read access (the voice-selection screen needs the full list with
    no auth). Create/update/delete restricted to admins.
    """

    queryset = VoicePart.objects.all()
    serializer_class = VoicePartSerializer
    pagination_class = None  # small, fixed-ish list — no need to paginate

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return []
        return [IsAdmin()]
