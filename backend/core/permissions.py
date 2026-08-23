from rest_framework.permissions import BasePermission


class IsAdmin(BasePermission):
    """Allows access only to authenticated users with role == 'admin'."""

    message = "You don't have permission to access this page."

    def has_permission(self, request, view):
        user = request.user
        return bool(user and getattr(user, "is_authenticated", False) and getattr(user, "is_admin", False))


class IsAuthenticatedSupabaseUser(BasePermission):
    """Allows access to any request carrying a valid Supabase JWT."""

    message = "Please log in to continue."

    def has_permission(self, request, view):
        return bool(request.user and getattr(request.user, "is_authenticated", False))
