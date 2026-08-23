import { Loader2 } from "lucide-react";

export function FullPageLoader({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-muted-foreground">
      <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
      <p className="text-sm" role="status">
        {label}…
      </p>
    </div>
  );
}
