import * as React from "react";
import { AlertTriangle } from "lucide-react";

interface State {
  error: Error | null;
  componentStack: string | null;
  copied: boolean;
}

/**
 * Last line of defence: a render error in one page shows a recoverable screen
 * instead of a blank document.
 *
 * The error text is shown rather than hidden. A screen that says only
 * "something broke" gives whoever has to fix it nothing to work with, and the
 * message is already in the browser console anyway — putting it on the page
 * just means the person reporting the problem can copy it.
 */
export class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null, componentStack: null, copied: false };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.setState({ componentStack: info.componentStack ?? null });
    // In production this is where an error reporter would go.
    console.error("[dma_songs] render error", error, info.componentStack);
  }

  private details() {
    const { error, componentStack } = this.state;
    return [
      `Message: ${error?.message ?? "unknown"}`,
      "",
      error?.stack ?? "",
      "",
      "Component stack:",
      componentStack ?? "(unavailable)",
      "",
      `URL: ${window.location.href}`,
      `Agent: ${navigator.userAgent}`,
    ].join("\n");
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
        <AlertTriangle className="h-10 w-10 text-destructive" aria-hidden />
        <h1 className="font-display text-2xl">Something broke on this page</h1>

        <p className="max-w-md text-center text-sm text-muted-foreground">
          Reloading usually clears it. If it keeps happening, send the details below to an
          administrator along with what you were doing.
        </p>

        <p
          className="max-w-xl rounded-md border border-destructive/30 bg-destructive/5 px-4 py-2 text-center font-mono text-sm text-destructive"
          role="alert"
        >
          {this.state.error.message}
        </p>

        <div className="flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Reload the page
          </button>
          <button
            type="button"
            onClick={() => window.location.assign("/")}
            className="rounded-md border border-input bg-card px-4 py-2 text-sm font-semibold hover:bg-accent"
          >
            Back to the home page
          </button>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(this.details()).then(
                () => this.setState({ copied: true }),
                () => this.setState({ copied: false }),
              );
            }}
            className="rounded-md border border-input bg-card px-4 py-2 text-sm font-semibold hover:bg-accent"
          >
            {this.state.copied ? "Copied" : "Copy the details"}
          </button>
        </div>

        <details className="w-full max-w-2xl">
          <summary className="cursor-pointer text-center text-xs text-muted-foreground">
            Technical details
          </summary>
          <pre className="mt-2 max-h-64 overflow-auto rounded-md border border-border bg-muted p-3 text-xs leading-relaxed">
            {this.details()}
          </pre>
        </details>
      </div>
    );
  }
}
