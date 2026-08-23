from rest_framework import mixins, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import IsAdmin, IsAuthenticatedSupabaseUser
from users.models import Profile
from users.serializers import (
    ProfileAdminUpdateSerializer,
    ProfileSelfUpdateSerializer,
    ProfileSerializer,
)


class ProfileViewSet(mixins.ListModelMixin, mixins.UpdateModelMixin, viewsets.GenericViewSet):
    """
    GET  /api/users/       — list all profiles                [admin]
    PATCH /api/users/:id/  — update another user's role/voice  [admin]
    """

    queryset = Profile.objects.select_related("voice_part").all()
    permission_classes = [IsAdmin]

    def get_serializer_class(self):
        if self.action == "partial_update":
            return ProfileAdminUpdateSerializer
        return ProfileSerializer


class MyProfileView(APIView):
    """
    GET   /api/users/me/  — fetch (and lazily create) the caller's profile row.
    PATCH /api/users/me/  — update the caller's own voice_part.
    """

    permission_classes = [IsAuthenticatedSupabaseUser]

    def get(self, request):
        profile, _ = Profile.objects.get_or_create(
            id=request.user.id, defaults={"email": request.user.email or "", "role": "user"}
        )
        return Response(ProfileSerializer(profile).data)

    def patch(self, request):
        profile, _ = Profile.objects.get_or_create(
            id=request.user.id, defaults={"email": request.user.email or "", "role": "user"}
        )
        serializer = ProfileSelfUpdateSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(ProfileSerializer(profile).data)
