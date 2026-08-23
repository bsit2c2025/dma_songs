from django.db.models import Q
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from core.permissions import IsAdmin
from songs.models import Song
from songs.serializers import SongDetailSerializer, SongSerializer, SongWriteSerializer
from songs.services import duplicate_song, reorder_songs


class SongViewSet(viewsets.ModelViewSet):
    """
    GET  /api/songs/?voice=soprano-1&category=entrance&search=alleluia&published=true
         Public callers only ever see published=True songs, regardless of the
         `published` query param — that param only has effect for admins.
    GET  /api/songs/:id/          — includes related songs
    POST/PATCH/DELETE             — admin only
    POST /api/songs/:id/duplicate/
    POST /api/songs/:id/publish/
    POST /api/songs/reorder/      — body: {"ordered_ids": ["<uuid>", ...]}
    """

    queryset = Song.objects.select_related("category").prefetch_related("voice_parts")

    def get_serializer_class(self):
        if self.action == "retrieve":
            return SongDetailSerializer
        if self.action in ["create", "update", "partial_update"]:
            return SongWriteSerializer
        return SongSerializer

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return []
        return [IsAdmin()]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        is_admin = bool(user and getattr(user, "is_authenticated", False) and getattr(user, "is_admin", False))

        if not is_admin:
            qs = qs.filter(published=True)
        else:
            published_param = self.request.query_params.get("published")
            if published_param is not None:
                qs = qs.filter(published=published_param.lower() == "true")

        voice_slug = self.request.query_params.get("voice")
        if voice_slug:
            qs = qs.filter(voice_parts__slug=voice_slug)

        category_slug = self.request.query_params.get("category")
        if category_slug:
            qs = qs.filter(category__slug=category_slug)

        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(Q(title__icontains=search) | Q(composer__icontains=search))

        return qs.distinct()

    @action(detail=True, methods=["post"], permission_classes=[IsAdmin])
    def duplicate(self, request, pk=None):
        song = self.get_object()
        copy = duplicate_song(song)
        return Response(SongSerializer(copy).data, status=201)

    @action(detail=True, methods=["post"], permission_classes=[IsAdmin])
    def publish(self, request, pk=None):
        song = self.get_object()
        song.published = not song.published
        song.save(update_fields=["published"])
        return Response(SongSerializer(song).data)

    @action(detail=False, methods=["post"], permission_classes=[IsAdmin])
    def reorder(self, request):
        ordered_ids = request.data.get("ordered_ids")
        if not isinstance(ordered_ids, list) or not ordered_ids:
            return Response(
                {"error": {"message": "ordered_ids must be a non-empty list.", "detail": None}},
                status=400,
            )
        try:
            reorder_songs(ordered_ids)
        except ValueError as exc:
            return Response({"error": {"message": str(exc), "detail": None}}, status=400)
        return Response({"detail": "Songs reordered."})
