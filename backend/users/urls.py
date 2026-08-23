from django.urls import path
from rest_framework.routers import DefaultRouter

from users.views import MyProfileView, ProfileViewSet

router = DefaultRouter(trailing_slash=True)
router.register("", ProfileViewSet, basename="profile")

urlpatterns = [
    path("me/", MyProfileView.as_view(), name="my-profile"),
] + router.urls
