import { Link } from "react-router-dom";
import { RefreshCw, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/AuthProvider";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export default function Unauthorized() {
  useDocumentTitle("Access denied");
  const { user, profile, roles, identityError, refreshProfile } = useAuth();

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center gap-4 text-center">
      <ShieldAlert className="h-10 w-10 text-destructive" aria-hidden />
      <h1 className="text-3xl">Access denied</h1>

      {identityError ? (
        <>
          <p className="text-muted-foreground">
            Your roles couldn't be read from the database, so the app can't tell whether you're an
            administrator. This is a configuration problem, not a permissions decision.
          </p>
          <p className="w-full rounded-md border border-destructive/30 bg-destructive/5 px-4 py-2 text-left font-mono text-xs text-destructive">
            {identityError}
          </p>
          <p className="text-sm text-muted-foreground">
            Run <code className="font-mono">supabase/diagnose.sql</code> in the Supabase SQL Editor —
            it will name the missing policy or table.
          </p>
        </>
      ) : (
        <p className="text-muted-foreground">
          Your account doesn't have administrator access. If that's a mistake, ask an existing
          administrator to grant it, or run <code className="font-mono">supabase/diagnose.sql</code>{" "}
          to see what the database thinks.
        </p>
      )}

      {/* Signed-in identity, so a promotion that didn't take is obvious at a glance. */}
      <dl className="w-full rounded-md border border-border bg-card p-4 text-left text-sm">
        <div className="flex justify-between gap-4 py-1">
          <dt className="text-muted-foreground">Signed in as</dt>
          <dd className="truncate font-medium">{user?.email ?? "not signed in"}</dd>
        </div>
        <div className="flex justify-between gap-4 py-1">
          <dt className="text-muted-foreground">Account ID</dt>
          <dd className="truncate font-mono text-xs">{user?.id ?? "—"}</dd>
        </div>
        <div className="flex justify-between gap-4 py-1">
          <dt className="text-muted-foreground">Profile row</dt>
          <dd className="font-medium">{profile ? "found" : "missing"}</dd>
        </div>
        <div className="flex justify-between gap-4 py-1">
          <dt className="text-muted-foreground">Roles the database returned</dt>
          <dd className="font-mono text-xs">{roles.length ? roles.join(", ") : "none"}</dd>
        </div>
      </dl>

      <p className="text-xs text-muted-foreground">
        A role granted in SQL only reaches the browser on the next sign-in or refresh.
      </p>

      <div className="flex flex-wrap justify-center gap-3">
        <Button onClick={() => void refreshProfile()} variant="outline">
          <RefreshCw aria-hidden /> Re-check my access
        </Button>
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
