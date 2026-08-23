import * as React from "react";

const BASE = "DLL Music and Arts";

/** Minimal SEO: page title plus the meta description search engines read. */
export function useDocumentTitle(title?: string, description?: string) {
  React.useEffect(() => {
    document.title = title ? `${title} — ${BASE}` : `${BASE} — Song Library`;
    if (!description) return;
    let tag = document.querySelector('meta[name="description"]');
    if (!tag) {
      tag = document.createElement("meta");
      tag.setAttribute("name", "description");
      document.head.appendChild(tag);
    }
    tag.setAttribute("content", description);
  }, [title, description]);
}
