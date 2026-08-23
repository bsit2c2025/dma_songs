import * as React from "react";
import { sanitizeRichText } from "@/lib/sanitize";
import { cn } from "@/lib/utils";

/**
 * The only place in the app that sets HTML directly, and it sanitizes on every
 * render. Announcement bodies are also sanitized before they are stored.
 */
export function RichText({ html, className }: { html: string; className?: string }) {
  const clean = React.useMemo(() => sanitizeRichText(html), [html]);
  return (
    <div className={cn("prose-announcement", className)} dangerouslySetInnerHTML={{ __html: clean }} />
  );
}
