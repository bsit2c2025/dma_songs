import { Link } from "react-router-dom";
import { useSettings } from "@/hooks/useSettings";
import { settingString } from "@/services/settings";
import { cn } from "@/lib/utils";

interface LogoProps {
  to?: string;
  size?: "sm" | "md";
  showWordmark?: boolean;
  className?: string;
}

/**
 * The official DLL Music and Arts mark lives at public/logo.svg (replace the
 * placeholder with the real asset). It is always rendered in a square box with
 * object-contain so it is never stretched, whatever aspect ratio the file has.
 */
export function Logo({ to = "/", size = "md", showWordmark = true, className }: LogoProps) {
  const { data: settings } = useSettings();
  const logoUrl = settingString(settings, "app.logo_url", "/logo.svg");
  const appName = settingString(settings, "app.name", "DLL Music and Arts");
  const organization = settingString(settings, "app.organization", "Dalubhasaan ng Lungsod ng Lucena");

  const content = (
    <span className={cn("flex items-center gap-3", className)}>
      <img
        src={logoUrl}
        alt={showWordmark ? "" : appName}
        aria-hidden={showWordmark || undefined}
        className={cn("shrink-0 object-contain", size === "sm" ? "h-9 w-9" : "h-11 w-11")}
      />
      {showWordmark ? (
        <span className="min-w-0">
          <span
            className={cn(
              "block truncate font-display leading-tight",
              size === "sm" ? "text-base" : "text-lg",
            )}
          >
            {appName}
          </span>
          <span className="block truncate font-mono text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
            {organization}
          </span>
        </span>
      ) : null}
    </span>
  );

  if (!to) return content;
  return (
    <Link to={to} className="rounded-md focus-visible:ring-2 focus-visible:ring-ring">
      {content}
    </Link>
  );
}
