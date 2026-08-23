from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from announcements.models import Announcement
from announcements.serializers import AnnouncementSerializer
from core.permissions import IsAdmin


class AnnouncementViewSet(viewsets.ModelViewSet):
    """
    GET  /api/announcements/           — admins see all; public sees published only
    GET  /api/announcements/current/   — the single published announcement (public hero)
    POST/PATCH/DELETE                  — admin only
    POST /api/announcements/:id/publish/ — publish this one, unpublish all others [admin]
    """

    serializer_class = AnnouncementSerializer
    pagination_class = None

    def get_queryset(self):
        qs = Announcement.objects.all()
        user = self.request.user
        if not (user and getattr(user, "is_authenticated", False) and getattr(user, "is_admin", False)):
            qs = qs.filter(published=True)
        return qs

    def get_permissions(self):
        if self.action in ["list", "retrieve", "current"]:
            return []
        return [IsAdmin()]

    @action(detail=False, methods=["get"])
    def current(self, request):
        announcement = Announcement.objects.filter(published=True).first()
        if not announcement:
            return Response(
                {"error": {"message": "No announcement is currently published.", "detail": None}},
                status=404,
            )
        return Response(self.get_serializer(announcement).data)

    @action(detail=True, methods=["post"], permission_classes=[IsAdmin])
    def publish(self, request, pk=None):
        announcement = self.get_object()
        announcement.published = True
        announcement.save()
        return Response(self.get_serializer(announcement).data)
