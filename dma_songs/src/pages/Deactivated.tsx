import { Link } from "react-router-dom";
import { LogOut, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/AuthProvider";
import { signOut } from "@/services/auth";
import { useSettings } from "@/hooks/useSettings";
import { settingString } from "@/services/settings";
import { formatDate } from "@/lib/utils";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

/**
 * What a deactivated member sees.
 *
 * The alternative — an account that simply stops working — leaves somebody
 * refreshing a page and guessing. A sentence and a name to write to is the
 * least the situation deserves.
 */
export default function Deactivated() {
  useDocumentTitle("Account deactivated");
  const { profile, user, refreshProfile } = useAuth();
  const { data: settings } = useSettings();
  const contact = settingString(settings, "legal.contact_email", "");

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-4 text-center">
      <UserX className="h-10 w-10 text-destructive" aria-hidden />
      <h1 className="text-3xl">Your account is deactivated</h1>

      <p className="text-muted-foreground">
        You can still sign in, but the music library and events are closed to you until an
        administrator turns your account back on.
      </p>

      {profile?.deactivation_reason ? (
        <div className="w-full rounded-md border border-destructive/30 bg-destructive/5 p-4 text-left">
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-destructive">
            Reason given
          </p>
          <p className="mt-1.5 text-sm">{profile.deactivation_reason}</p>
          {profile.deactivated_at ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Deactivated {formatDate(profile.deactivated_at)}.
            </p>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No reason was recorded.</p>
      )}

      <p className="text-sm text-muted-foreground">
        Signed in as <strong>{user?.email}</strong>.
      </p>

      <div className="flex flex-wrap justify-center gap-3">
        <Button onClick={() => void refreshProfile()}>Check again</Button>
        <Button asChild variant="outline">
          <Link to="/">Home page</Link>
        </Button>
        <Button variant="ghost" onClick={() => void signOut()}>
          <LogOut aria-hidden /> Sign out
        </Button>
      </div>

      {contact ? (
        <p className="text-xs text-muted-foreground">
          Think this is a mistake? Email{" "}
          <a className="underline" href={`mailto:${contact}`}>
            {contact}
          </a>
          .
        </p>
      ) : null}
    </div>
  );
}
