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
    // min-w-0 on both the row and the text block: without it a flex item keeps
    // its default min-width:auto, refuses to shrink below its content, and a
    // long organisation name pushes the whole header wider than a phone
    // screen. The truncate below can only work once shrinking is allowed.
    <span className={cn("flex min-w-0 items-center gap-3", className)}>
      <img
        src={logoUrl}
        alt={showWordmark ? "" : appName}
        aria-hidden={showWordmark || undefined}
        className={cn("shrink-0 object-contain", size === "sm" ? "h-9 w-9" : "h-11 w-11")}
      />
      {showWordmark ? (
        <span className="min-w-0 flex-1">
          <span
            className={cn(
              "block truncate font-display leading-tight",
              size === "sm" ? "text-base" : "text-lg",
            )}
          >
            {appName}
          </span>
          {/* The long form is the first thing worth losing on a narrow screen. */}
          <span className="hidden truncate font-mono text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground sm:block">
            {organization}
          </span>
        </span>
      ) : null}
    </span>
  );

  if (!to) return content;
  return (
    <Link to={to} className="min-w-0 rounded-md focus-visible:ring-2 focus-visible:ring-ring">
      {content}
    </Link>
  );
}
