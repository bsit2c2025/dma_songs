import { env } from "@/lib/env";

/**
 * Database errors can leak schema details, so ordinary users get a plain
 * sentence while the original is kept in the console for developers.
 */
const FRIENDLY: Record<string, string> = {
  "23503": "That item is still linked to other records, so it can't be removed yet.",
  "23505": "That already exists. Try a different name.",
  "23514": "Some of those values aren't allowed. Check the highlighted fields.",
  "42501": "You don't have permission to do that.",
  PGRST116: "We couldn't find that item.",
  "invalid_credentials": "That email and password combination didn't work.",
  "email_not_confirmed": "Confirm your email address first, then sign in.",
  "over_email_send_rate_limit": "Too many attempts. Wait a minute and try again.",
  "user_already_exists": "An account with that email already exists. Sign in instead.",
  "weak_password": "Choose a longer password — at least 8 characters.",
};

export interface AppError {
  message: string;
  code?: string;
}

export function toAppError(error: unknown, fallback = "Something went wrong. Try again."): AppError {
  if (env.isDev) console.error("[dma_songs]", error);

  if (error && typeof error === "object") {
    const e = error as { code?: string; message?: string; details?: string; hint?: string };
    const code = e.code;

    // Database RAISE EXCEPTION messages are written for people (see the
    // voice-part delete guard) and are safe to show verbatim.
    if (e.message && /^[A-Z][^{}]*[.!]$/.test(e.message) && e.message.length < 220) {
      return { message: e.message, code };
    }
    if (code && FRIENDLY[code]) return { message: FRIENDLY[code], code };
    if (e.message && FRIENDLY[e.message]) return { message: FRIENDLY[e.message], code };
    if (e.message?.includes("Failed to fetch")) {
      return { message: "Can't reach the server. Check your connection and try again.", code };
    }
  }
  return { message: fallback };
}

export function errorMessage(error: unknown, fallback?: string) {
  return toAppError(error, fallback).message;
}
