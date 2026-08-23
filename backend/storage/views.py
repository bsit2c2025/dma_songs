from django.conf import settings
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import IsAdmin
from storage.utils import SignedUploadError, create_signed_upload_url

_BUCKET_CONFIG = {
    "music-sheet": {
        "bucket_setting": "SUPABASE_STORAGE_MUSIC_SHEETS_BUCKET",
        "allowed_types_setting": "MUSIC_SHEET_ALLOWED_CONTENT_TYPES",
        "max_size_setting": "MUSIC_SHEET_MAX_SIZE_BYTES",
        "folder": "sheets",
    },
    "hero-image": {
        "bucket_setting": "SUPABASE_STORAGE_HERO_IMAGES_BUCKET",
        "allowed_types_setting": "HERO_IMAGE_ALLOWED_CONTENT_TYPES",
        "max_size_setting": "HERO_IMAGE_MAX_SIZE_BYTES",
        "folder": "hero",
    },
}


class SignedUploadURLView(APIView):
    """
    POST /api/storage/signed-upload-url/
    Body: {"purpose": "music-sheet" | "hero-image", "filename": "x.pdf",
           "content_type": "application/pdf", "size_bytes": 123456}
    """

    permission_classes = [IsAdmin]

    def post(self, request):
        purpose = request.data.get("purpose")
        filename = request.data.get("filename")
        content_type = request.data.get("content_type")
        size_bytes = request.data.get("size_bytes")

        config = _BUCKET_CONFIG.get(purpose)
        if not config:
            return Response(
                {"error": {"message": "purpose must be 'music-sheet' or 'hero-image'.", "detail": None}},
                status=400,
            )
        if not filename or not content_type:
            return Response(
                {"error": {"message": "filename and content_type are required.", "detail": None}},
                status=400,
            )

        allowed_types = getattr(settings, config["allowed_types_setting"])
        max_size = getattr(settings, config["max_size_setting"])

        if content_type not in allowed_types:
            return Response(
                {"error": {"message": f"File type {content_type} is not allowed.", "detail": None}},
                status=400,
            )
        if size_bytes is not None and int(size_bytes) > max_size:
            return Response(
                {"error": {"message": "File is too large.", "detail": None}},
                status=400,
            )

        bucket = getattr(settings, config["bucket_setting"])
        try:
            result = create_signed_upload_url(bucket, filename, folder=config["folder"])
        except SignedUploadError as exc:
            return Response({"error": {"message": str(exc), "detail": None}}, status=502)

        return Response(result, status=201)
