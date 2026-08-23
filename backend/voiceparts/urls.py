from rest_framework.routers import DefaultRouter

from voiceparts.views import VoicePartViewSet

router = DefaultRouter(trailing_slash=True)
router.register("", VoicePartViewSet, basename="voice-part")

urlpatterns = router.urls
