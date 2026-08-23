import * as React from "react";
import { AlertTriangle } from "lucide-react";

interface State {
  error: Error | null;
}

/**
 * Last line of defence: a render error in one page shows a recoverable screen
 * instead of a blank document.
 */
export class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // In production this is where an error reporter would go.
    console.error("[dma_songs] render error", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <AlertTriangle className="h-10 w-10 text-destructive" aria-hidden />
        <h1 className="font-display text-2xl">Something broke on this page</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          Reloading usually clears it. If it keeps happening, tell an administrator what you were doing.
        </p>
        <button
          type="button"
          onClick={() => window.location.assign("/")}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          Back to the home page
        </button>
      </div>
    );
  }
}
