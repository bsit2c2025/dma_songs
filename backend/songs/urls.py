from rest_framework.routers import DefaultRouter

from songs.views import SongViewSet

router = DefaultRouter(trailing_slash=True)
router.register("", SongViewSet, basename="song")

urlpatterns = router.urls
