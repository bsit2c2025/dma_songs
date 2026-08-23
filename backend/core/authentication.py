"""
Verifies JWTs issued by Supabase Auth and attaches a lightweight user object
(backed by the `profiles` table) to the request.

React authenticates directly against Supabase Auth and sends the resulting
access token as `Authorization: Bearer <token>` on every request to Django.
Django never issues or stores passwords itself — it only verifies the token
Supabase already signed.
"""

import jwt
from django.conf import settings
from rest_framework import authentication, exceptions


class SupabaseUser:
    """
    A minimal stand-in for Django's User model, backed by Supabase Auth +
    the `profiles` table. Exposes just enough for DRF permission checks and
    for views to know who is calling.
    """

    def __init__(self, id, email, role, voice_part_id):
        self.id = id
        self.email = email
        self.role = role
        self.voice_part_id = voice_part_id
        self.is_authenticated = True
        self.is_anonymous = False

    @property
    def is_admin(self):
        return self.role == "admin"

    def __str__(self):
        return self.email or str(self.id)


class SupabaseJWTAuthentication(authentication.BaseAuthentication):
    """
    Expects `Authorization: Bearer <supabase_access_token>`.

    On success, returns (SupabaseUser, decoded_token). On a missing header,
    returns None so DRF treats the request as anonymous (public endpoints
    still work). On an invalid/expired token, raises AuthenticationFailed.
    """

    keyword = "Bearer"

    def authenticate(self, request):
        auth_header = authentication.get_authorization_header(request).decode("utf-8")
        if not auth_header or not auth_header.startswith(f"{self.keyword} "):
            return None

        token = auth_header[len(self.keyword) + 1 :].strip()
        if not token:
            return None

        try:
            payload = jwt.decode(
                token,
                settings.SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                audience="authenticated",
            )
        except jwt.ExpiredSignatureError:
            raise exceptions.AuthenticationFailed("Your session has expired. Please log in again.")
        except jwt.InvalidTokenError:
            raise exceptions.AuthenticationFailed("Invalid authentication token.")

        user_id = payload.get("sub")
        email = payload.get("email")
        if not user_id:
            raise exceptions.AuthenticationFailed("Invalid authentication token.")

        # Import here to avoid a hard circular import at module load time.
        from users.models import Profile

        try:
            profile = Profile.objects.get(id=user_id)
        except Profile.DoesNotExist:
            # A Supabase Auth user exists but has no matching profiles row yet
            # (e.g. the row-creation trigger hasn't run). Treat as a plain
            # authenticated user with no admin rights rather than failing.
            role = "user"
            voice_part_id = None
        else:
            role = profile.role
            voice_part_id = profile.voice_part_id

        user = SupabaseUser(id=user_id, email=email, role=role, voice_part_id=voice_part_id)
        return (user, payload)
