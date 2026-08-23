from django.urls import path

from storage.views import SignedUploadURLView

urlpatterns = [
    path("signed-upload-url/", SignedUploadURLView.as_view(), name="signed-upload-url"),
]
