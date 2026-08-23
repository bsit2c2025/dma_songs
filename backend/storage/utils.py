"""
Generates Supabase Storage signed upload URLs so the admin's browser can
upload a file directly to Storage without the binary passing through Django.

Django's only job here is to validate that the caller is an admin and that
the file type/size are acceptable, then ask Supabase (using the service-role
key, which never leaves this server) for a short-lived signed URL.
"""

import uuid

import requests
from django.conf import settings


class SignedUploadError(Exception):
    pass


def create_signed_upload_url(bucket: str, original_filename: str, folder: str = "") -> dict:
    """
    Returns {"signed_url": "<absolute PUT url>", "path": "<storage path>",
    "public_url": "<absolute public read url>"}.
    """
    extension = original_filename.rsplit(".", 1)[-1].lower() if "." in original_filename else ""
    unique_name = f"{uuid.uuid4()}.{extension}" if extension else str(uuid.uuid4())
    path = f"{folder.strip('/')}/{unique_name}" if folder else unique_name

    endpoint = f"{settings.SUPABASE_URL}/storage/v1/object/upload/sign/{bucket}/{path}"
    response = requests.post(
        endpoint,
        headers={
            "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
            "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
        },
        json={},
        timeout=10,
    )

    if response.status_code >= 400:
        raise SignedUploadError("Could not prepare an upload URL. Please try again.")

    data = response.json()
    signed_path = data.get("url")
    if not signed_path:
        raise SignedUploadError("Could not prepare an upload URL. Please try again.")

    return {
        "signed_url": f"{settings.SUPABASE_URL}/storage/v1{signed_path}",
        "path": path,
        "public_url": f"{settings.SUPABASE_URL}/storage/v1/object/public/{bucket}/{path}",
    }
