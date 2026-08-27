import * as React from "react";
import { Link } from "react-router-dom";
import { Cookie, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const KEY = "dma-songs-storage-notice";

/**
 * A notice, not a consent gate.
 *
 * Everything this site keeps in the browser is strictly necessary — the
 * sign-in session, a guest's chosen voice part, and the fact this notice was
 * dismissed. Under RA 10173 that does not need opt-in consent, and a modal
 * demanding permission for things the site cannot work without teaches people
 * to click past notices without reading them. So it informs, sits at the
 * bottom, and never blocks the page.
 */
export function StorageNotice() {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    try {
      if (!window.localStorage.getItem(KEY)) setVisible(true);
    } catch {
      /* private browsing: nothing persists anyway, so nothing to announce */
    }
  }, []);

  function dismiss() {
    try {
      window.localStorage.setItem(KEY, new Date().toISOString());
    } catch {
      /* ignore */
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Browser storage notice"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 p-4 shadow-lg backdrop-blur"
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-center">
        <Cookie className="hidden h-5 w-5 shrink-0 text-brass sm:block" aria-hidden />
        <p className="flex-1 text-sm text-muted-foreground">
          This site stores a little data in your browser — your sign-in session and your chosen
          voice part. Nothing is used for advertising or tracking.{" "}
          <Link to="/privacy" className="font-semibold text-foreground underline">
            Read the privacy notice
          </Link>
          .
        </p>
        <div className="flex shrink-0 gap-2">
          <Button size="sm" onClick={dismiss}>
            Got it
          </Button>
          <Button size="icon" variant="ghost" onClick={dismiss} aria-label="Dismiss this notice">
            <X />
          </Button>
        </div>
      </div>
    </div>
  );
}
