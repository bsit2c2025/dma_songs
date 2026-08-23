import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export default function Unauthorized() {
  useDocumentTitle("Access denied");
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <ShieldAlert className="h-10 w-10 text-destructive" aria-hidden />
      <h1 className="text-3xl">Access denied</h1>
      <p className="max-w-md text-muted-foreground">
        Your account doesn't have administrator access. If that's a mistake, ask an existing
        administrator to grant it to you.
      </p>
      <div className="flex gap-3">
        <Button asChild>
          <Link to="/">Back to the site</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/profile">Your profile</Link>
        </Button>
      </div>
    </div>
  );
}
