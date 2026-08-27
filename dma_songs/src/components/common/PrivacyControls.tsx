import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { Download, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { eraseMyAccount, exportMyData } from "@/services/privacy";
import { signOut } from "@/services/auth";
import { errorMessage } from "@/lib/errors";

/**
 * The Data Privacy Act gives members a right to a copy of their data and a
 * right to have it erased. Both are buttons here rather than an email address
 * and a wait, because a right that needs a request is one most people never
 * exercise.
 */
export function PrivacyControls() {
  const navigate = useNavigate();
  const [confirming, setConfirming] = React.useState(false);

  const exportData = useMutation({
    mutationFn: exportMyData,
    onSuccess: (data) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `dma-songs-my-data-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Your data has been downloaded");
    },
    onError: (error) => toast.error(errorMessage(error, "The export didn't work.")),
  });

  const erase = useMutation({
    mutationFn: eraseMyAccount,
    onSuccess: async () => {
      toast.success("Your account has been erased");
      await signOut();
      navigate("/", { replace: true });
    },
    onError: (error) => toast.error(errorMessage(error, "Your account couldn't be erased.")),
  });

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold">Get a copy of your data</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Everything the system holds about you, as a JSON file.
        </p>
        <Button
          className="mt-2"
          size="sm"
          variant="outline"
          loading={exportData.isPending}
          onClick={() => exportData.mutate()}
        >
          <Download aria-hidden /> Download my data
        </Button>
      </div>

      <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
        <p className="text-sm font-semibold text-destructive">Erase your account</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Removes your name, email, picture and voice part, and closes the account. You will be
          signed out. This can't be undone.
        </p>
        <Button
          className="mt-2"
          size="sm"
          variant="destructive"
          onClick={() => setConfirming(true)}
        >
          <Trash2 aria-hidden /> Erase my account
        </Button>
      </div>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Erase your account?"
        destructive
        confirmLabel="Erase my account"
        confirmPhrase="ERASE"
        loading={erase.isPending}
        onConfirm={() => erase.mutate()}
        description={
          <span className="block space-y-2">
            <span className="block">
              Your name, email, picture and voice part will be removed and you'll be signed out.
            </span>
            <span className="block text-muted-foreground">
              Download your data first if you want a copy — after this it's gone.
            </span>
          </span>
        }
      />
    </div>
  );
}
