import { RefreshCw } from "lucide-react";
import { useDataFreshness } from "@/hooks/useDataFreshness";
import { relativeTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

/** "Updated 2 minutes ago · Refresh", for when live updates aren't enough. */
export function FreshnessBar({ className }: { className?: string }) {
  const { updatedAt, isFetching, refresh } = useDataFreshness();

  return (
    <div className={cn("flex items-center gap-2 text-xs text-muted-foreground", className)}>
      <span>
        {isFetching ? "Updating…" : `Updated ${relativeTime(new Date(updatedAt).toISOString())}`}
      </span>
      <button
        type="button"
        onClick={refresh}
        disabled={isFetching}
        className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-semibold hover:bg-accent hover:text-foreground disabled:opacity-50"
      >
        <RefreshCw className={cn("h-3 w-3", isFetching && "animate-spin")} aria-hidden />
        Refresh
      </button>
    </div>
  );
}
