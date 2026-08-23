import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { errorMessage } from "@/lib/errors";

interface ErrorStateProps {
  title?: string;
  error: unknown;
  onRetry?: () => void;
}

export function ErrorState({ title = "That didn't load", error, onRetry }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-6 py-10 text-center"
    >
      <AlertTriangle className="h-7 w-7 text-destructive" aria-hidden />
      <div className="space-y-1">
        <p className="font-display text-lg">{title}</p>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">{errorMessage(error)}</p>
      </div>
      {onRetry ? (
        <Button variant="outline" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}
