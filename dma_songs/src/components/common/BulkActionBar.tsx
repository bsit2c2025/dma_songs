import * as React from "react";
import { CheckSquare, X } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * The selection bar for bulk work.
 *
 * Selection deliberately survives searching and paging — the whole point is to
 * find four songs one way, three another, and act on all seven. That is also
 * the risk, so the count is always on screen, the bar names what is selected,
 * and clearing takes one click.
 */
export function BulkActionBar({
  count,
  onClear,
  children,
}: {
  count: number;
  onClear: () => void;
  children: React.ReactNode;
}) {
  if (count === 0) return null;

  return (
    <div
      role="region"
      aria-label={`${count} songs selected`}
      className="sticky top-2 z-30 flex flex-wrap items-center gap-3 rounded-lg border-2 border-primary/40 bg-card p-3 shadow-lg"
    >
      <span className="flex items-center gap-2 font-semibold">
        <CheckSquare className="h-4 w-4 text-primary" aria-hidden />
        {count} selected
      </span>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
      <Button variant="ghost" size="sm" className="ml-auto" onClick={onClear}>
        <X aria-hidden /> Clear
      </Button>
    </div>
  );
}
