import { Check } from "lucide-react";
import { useVoicePart } from "@/features/voice/VoicePartProvider";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Signature element: the eight parts sit on a four-line stave, in score order
 * from soprano at the top of the range to bass. The stave is decoration, but
 * the ordering is the same one a chorister reads on paper.
 */
export function VoicePartSelector({ compact = false }: { compact?: boolean }) {
  const { parts, selectedId, select, isLoading } = useVoicePart();

  if (isLoading) {
    return (
      <div className="flex flex-wrap gap-2" aria-hidden>
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-9 w-24 rounded-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="relative">
      {!compact ? (
        <div className="stave pointer-events-none absolute inset-x-0 top-1/2 h-[37px] -translate-y-1/2 opacity-60" aria-hidden />
      ) : null}
      <fieldset className="relative">
        <legend className="sr-only">Choose your voice part</legend>
        <div className={cn("flex flex-wrap gap-2", compact && "gap-1.5")}>
          {parts.map((part) => {
            const active = part.id === selectedId;
            return (
              <button
                key={part.id}
                type="button"
                aria-pressed={active}
                onClick={() => select(active ? null : part.id)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border-2 bg-card font-semibold transition-all",
                  compact ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm",
                  active ? "shadow-sm" : "border-border hover:border-foreground/20",
                )}
                style={active ? { borderColor: part.color, color: part.color } : undefined}
              >
                <span className="font-mono text-[0.7rem] tracking-wider opacity-70">{part.short_code}</span>
                {part.name}
                {active ? <Check className="h-3.5 w-3.5" aria-hidden /> : null}
              </button>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}
