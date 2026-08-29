import * as React from "react";
import { useSettings } from "@/hooks/useSettings";
import { settingString } from "@/services/settings";

/**
 * Points the browser tab icon at whatever logo is set in Settings.
 *
 * The favicon in index.html is a static file, so uploading a new logo changed
 * the header and left the tab showing the old mark. This rewrites the link
 * element at runtime instead, which is the only way to make a favicon follow a
 * value that lives in the database.
 */
export function useFavicon() {
  const { data: settings } = useSettings();
  const logoUrl = settingString(settings, "app.logo_url", "/logo.svg");

  React.useEffect(() => {
    if (!logoUrl) return;

    let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    if (link.href !== logoUrl) link.href = logoUrl;

    // Apple's touch icon is a separate element and ignores rel="icon".
    let apple = document.querySelector<HTMLLinkElement>("link[rel='apple-touch-icon']");
    if (!apple) {
      apple = document.createElement("link");
      apple.rel = "apple-touch-icon";
      document.head.appendChild(apple);
    }
    apple.href = logoUrl;
  }, [logoUrl]);
}
