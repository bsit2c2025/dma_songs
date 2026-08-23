import { Music4 } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useVoicePart } from "@/features/voice/VoicePartProvider";

export const ALL_PARTS = "__all__";

/**
 * The library filter. Deliberately separate from the member's own section:
 * this only decides which songs are listed, so it defaults to showing
 * everything and anybody can look at any part's material.
 *
 * The person's own part is pulled to the top and labelled, which is the one
 * place the two ideas meet.
 */
export function VoicePartFilter({
  value,
  onChange,
  id = "voice-part-filter",
  className,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
  id?: string;
  className?: string;
}) {
  const { parts, myPartId } = useVoicePart();
  const mine = parts.find((part) => part.id === myPartId) ?? null;
  const others = parts.filter((part) => part.id !== myPartId);

  return (
    <Select
      value={value ?? ALL_PARTS}
      onValueChange={(next) => onChange(next === ALL_PARTS ? null : next)}
    >
      <SelectTrigger id={id} className={className} aria-label="Filter songs by voice part">
        <SelectValue placeholder="All voice parts" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_PARTS}>
          <span className="flex items-center gap-2">
            <Music4 className="h-4 w-4 text-muted-foreground" aria-hidden />
            All voice parts
          </span>
        </SelectItem>

        {mine ? (
          <>
            <SelectSeparator />
            <SelectItem value={mine.id}>
              <span className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: mine.color }}
                  aria-hidden
                />
                {mine.name}
                <span className="font-mono text-[0.65rem] uppercase tracking-wider text-brass">
                  your part
                </span>
              </span>
            </SelectItem>
          </>
        ) : null}

        <SelectSeparator />
        {others.map((part) => (
          <SelectItem key={part.id} value={part.id}>
            <span className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: part.color }}
                aria-hidden
              />
              {part.name}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
