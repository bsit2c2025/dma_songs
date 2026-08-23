from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/announcements/", include("announcements.urls")),
    path("api/songs/", include("songs.urls")),
    path("api/voice-parts/", include("voiceparts.urls")),
    path("api/categories/", include("categories.urls")),
    path("api/users/", include("users.urls")),
    path("api/storage/", include("storage.urls")),
    path("api/dashboard/", include("core.dashboard_urls")),
]
