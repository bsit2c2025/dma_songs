import { cn } from "@/lib/utils";
import type { VoiceClassification } from "@/types/models";

/**
 * Every voice part carries the same colour everywhere in the app — cards,
 * video tabs, dashboard, member list — so singers can find their line at a
 * glance. The colour comes from the database, not from a hardcoded map.
 */
export function VoicePartChip({
  part,
  size = "sm",
  className,
}: {
  part: Pick<VoiceClassification, "name" | "short_code" | "color">;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-semibold",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm",
        className,
      )}
      style={{ borderColor: `${part.color}40`, backgroundColor: `${part.color}14`, color: part.color }}
    >
      <span
        aria-hidden
        className="font-mono text-[0.7em] tracking-wider opacity-80"
      >
        {part.short_code ?? ""}
      </span>
      {part.name}
    </span>
  );
}
