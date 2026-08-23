import { ZodError } from "zod";

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
  // Always logged, not only in development. A production failure that leaves
  // no trace anywhere is the hardest kind to report and the hardest to fix.
  console.error("[dma_songs]", error);

  // A validation error that reaches this point is a bug in our own code, not
  // something the user did — the form resolver should already have caught it.
  // Naming the field beats "Something went wrong".
  if (error instanceof ZodError) {
    const first = error.issues[0];
    const where = first?.path.length ? first.path.join(".") : "form";
    return { message: `${where}: ${first?.message ?? "invalid value"}`, code: "validation" };
  }

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

    // Nothing matched. Rather than swallow it, append the raw message to the
    // fallback so a screenshot is enough to diagnose the problem.
    if (e.message) {
      return { message: `${fallback} (${[code, e.message].filter(Boolean).join(": ")})`, code };
    }
  }
  return { message: fallback };
}

export function errorMessage(error: unknown, fallback?: string) {
  return toAppError(error, fallback).message;
}
