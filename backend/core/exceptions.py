"""
Ensures every error response has a consistent shape:

    { "error": { "message": "<human readable>", "detail": <original detail> } }

and that unexpected server errors (e.g. raw database exceptions) never leak
internal details to the client.
"""

import logging

from django.db import DatabaseError
from django.http import Http404
from rest_framework import exceptions as drf_exceptions
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_default_handler

logger = logging.getLogger(__name__)

_DEFAULT_MESSAGES = {
    401: "Please log in to continue.",
    403: "You don't have permission to access this page.",
    404: "The requested resource was not found.",
}


def custom_exception_handler(exc, context):
    response = drf_default_handler(exc, context)

    if response is not None:
        message = _DEFAULT_MESSAGES.get(response.status_code, "Something went wrong. Please try again.")
        response.data = {"error": {"message": message, "detail": response.data}}
        return response

    # Anything DRF didn't already handle (e.g. a raw database error) — log it
    # server-side, but never expose internals to the client.
    if isinstance(exc, (DatabaseError, Http404)):
        logger.exception("Unhandled server error")
        return Response(
            {"error": {"message": "Unable to complete your request. Please try again.", "detail": None}},
            status=500,
        )

    logger.exception("Unhandled server error")
    return Response(
        {"error": {"message": "Something went wrong. Please try again.", "detail": None}},
        status=500,
    )
