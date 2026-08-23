from django.db.models import Count
from rest_framework.response import Response
from rest_framework.views import APIView

from announcements.models import Announcement
from core.permissions import IsAdmin
from songs.models import Song
from users.models import Profile
from voiceparts.models import VoicePart


class DashboardSummaryView(APIView):
    """GET /api/dashboard/summary/ — counts and distributions for the admin overview page."""

    permission_classes = [IsAdmin]

    def get(self, request):
        total_songs = Song.objects.count()
        published_songs = Song.objects.filter(published=True).count()

        voice_distribution = list(
            VoicePart.objects.annotate(user_count=Count("profile"))
            .order_by("display_order")
            .values("id", "name", "slug", "user_count")
        )

        current_announcement = (
            Announcement.objects.filter(published=True).values(
                "id", "title", "event_date", "event_time", "venue", "published"
            ).first()
        )

        return Response(
            {
                "total_songs": total_songs,
                "published_songs": published_songs,
                "unpublished_songs": total_songs - published_songs,
                "total_users": Profile.objects.count(),
                "voice_distribution": voice_distribution,
                "current_announcement": current_announcement,
            }
        )
