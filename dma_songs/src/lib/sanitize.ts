import DOMPurify from "dompurify";
import type { Config } from "dompurify";

/**
 * Announcement bodies are rich text. They are sanitized twice: once before
 * they are saved (so the database never holds a script tag) and once at render
 * time (so anything that slipped in through another path is still neutralised).
 */
const CONFIG: Config = {
  ALLOWED_TAGS: [
    "p", "br", "strong", "b", "em", "i", "u", "s", "ul", "ol", "li",
    "a", "h2", "h3", "blockquote", "code", "pre", "hr", "span",
  ],
  ALLOWED_ATTR: ["href", "target", "rel", "title"],
  ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|tel:|\/)/i,
  FORBID_TAGS: ["style", "script", "iframe", "form", "input", "object", "embed"],
  FORBID_ATTR: ["style", "onerror", "onclick", "onload"],
  RETURN_TRUSTED_TYPE: false,
};

let hookInstalled = false;
function installHook() {
  if (hookInstalled) return;
  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    if (node.tagName === "A" && node.hasAttribute("href")) {
      node.setAttribute("target", "_blank");
      node.setAttribute("rel", "noopener noreferrer nofollow");
    }
  });
  hookInstalled = true;
}

export function sanitizeRichText(html: string): string {
  installHook();
  return DOMPurify.sanitize(html ?? "", { ...CONFIG }) as unknown as string;
}

/** True when sanitizing would remove something — used by form validation. */
export function containsUnsafeMarkup(html: string) {
  return sanitizeRichText(html).replace(/\s+/g, "") !== (html ?? "").replace(/\s+/g, "");
}
