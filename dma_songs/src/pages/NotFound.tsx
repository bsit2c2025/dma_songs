import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export default function NotFound() {
  useDocumentTitle("Page not found");
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <p className="font-mono text-sm uppercase tracking-[0.2em] text-brass">404</p>
      <h1 className="text-3xl">That page isn't here</h1>
      <p className="max-w-md text-muted-foreground">
        The link may be out of date. The song library is the best place to pick things up again.
      </p>
      <div className="flex gap-3">
        <Button asChild>
          <Link to="/songs">Go to the library</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/">Home</Link>
        </Button>
      </div>
    </div>
  );
}
