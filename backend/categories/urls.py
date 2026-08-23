from rest_framework.routers import DefaultRouter

from categories.views import SongCategoryViewSet

router = DefaultRouter(trailing_slash=True)
router.register("", SongCategoryViewSet, basename="song-category")

urlpatterns = router.urls
