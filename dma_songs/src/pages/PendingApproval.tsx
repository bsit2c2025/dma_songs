import { Link } from "react-router-dom";
import { Clock, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/AuthProvider";
import { signOut } from "@/services/auth";
import { useSettings } from "@/hooks/useSettings";
import { settingString } from "@/services/settings";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export default function PendingApproval() {
  useDocumentTitle("Waiting for approval");
  const { profile, user, refreshProfile } = useAuth();
  const { data: settings } = useSettings();
  const contact = settingString(settings, "legal.contact_email", "");
  const rejected = Boolean(profile?.rejected_at);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-4 text-center">
      <Clock className="h-10 w-10 text-brass" aria-hidden />
      <h1 className="text-3xl">{rejected ? "Your request wasn't approved" : "Almost there"}</h1>

      {rejected ? (
        <p className="text-muted-foreground">
          An administrator reviewed your account and didn't approve it.
          {profile?.approval_note ? ` They said: “${profile.approval_note}”` : ""}
        </p>
      ) : (
        <p className="text-muted-foreground">
          Your account is waiting for an administrator to let you in. The music library opens up as
          soon as that happens — usually before the next rehearsal.
        </p>
      )}

      <p className="text-sm text-muted-foreground">
        Signed in as <strong>{user?.email}</strong>.
      </p>

      <div className="flex flex-wrap justify-center gap-3">
        <Button onClick={() => void refreshProfile()}>Check again</Button>
        <Button asChild variant="outline">
          <Link to="/">Back to the home page</Link>
        </Button>
        <Button variant="ghost" onClick={() => void signOut()}>
          <LogOut aria-hidden /> Sign out
        </Button>
      </div>

      {contact ? (
        <p className="text-xs text-muted-foreground">
          Been waiting a while? Email <a className="underline" href={`mailto:${contact}`}>{contact}</a>.
        </p>
      ) : null}
    </div>
  );
}
