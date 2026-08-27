import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Save, UserX } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { Field } from "@/components/common/Field";
import { updateMemberProfile } from "@/services/members";
import {
  anonymizeMember, getMemberNote, saveMemberNote, sendPasswordReset,
} from "@/services/privacy";
import { useAuth } from "@/features/auth/AuthProvider";
import { errorMessage } from "@/lib/errors";
import { env } from "@/lib/env";
import type { MemberSummary } from "@/types/models";

/**
 * Everything an administrator can do to one member's record, in one place.
 *
 * Two things deliberately absent: setting somebody's password, and deleting
 * their sign-in record. Both need the service-role key, which bypasses every
 * access rule in the database and therefore cannot live in a browser bundle.
 * The alternatives here — a reset link they follow themselves, and erasure of
 * the personal data — cover the same ground without that risk, and an
 * administrator who cannot set a password also cannot quietly sign in as
 * somebody else.
 */
export function MemberSheet({
  member,
  open,
  onOpenChange,
}: {
  member: MemberSummary | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [displayName, setDisplayName] = React.useState("");
  const [note, setNote] = React.useState("");
  const [confirmErase, setConfirmErase] = React.useState(false);

  const noteQuery = useQuery({
    queryKey: ["member-note", member?.id],
    queryFn: () => getMemberNote(member!.id),
    enabled: open && Boolean(member?.id),
  });

  React.useEffect(() => {
    if (member) setDisplayName(member.display_name ?? "");
  }, [member]);

  React.useEffect(() => {
    if (noteQuery.data !== undefined) setNote(noteQuery.data);
  }, [noteQuery.data]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "members"] });
    queryClient.invalidateQueries({ queryKey: ["member-note", member?.id] });
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!member || !user) return;
      await updateMemberProfile(member.id, { display_name: displayName.trim() });
      await saveMemberNote(member.id, note, user.id);
    },
    onSuccess: () => {
      invalidate();
      toast.success("Member updated");
      onOpenChange(false);
    },
    onError: (error) => toast.error(errorMessage(error, "That didn't save.")),
  });

  const reset = useMutation({
    mutationFn: () => sendPasswordReset(member!.email!, `${env.siteUrl}/reset-password`),
    onSuccess: () => toast.success("Reset link sent", {
      description: "They'll get an email with a link to set a new password.",
    }),
    onError: (error) => toast.error(errorMessage(error, "The reset email didn't send.")),
  });

  const erase = useMutation({
    mutationFn: () => anonymizeMember(member!.id),
    onSuccess: () => {
      invalidate();
      setConfirmErase(false);
      onOpenChange(false);
      toast.success("Member record erased");
    },
    onError: (error) => toast.error(errorMessage(error, "The member couldn't be removed.")),
  });

  const isSelf = member?.id === user?.id;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{member?.display_name || member?.email || "Member"}</DialogTitle>
            <DialogDescription>{member?.email ?? "No email on record"}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Field
              label="Display name"
              htmlFor="member-display-name"
              hint="What the rest of the ensemble sees."
            >
              <Input
                id="member-display-name"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
              />
            </Field>

            <div className="space-y-1.5">
              <Label htmlFor="member-note">Private note</Label>
              {noteQuery.isLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : (
                <Textarea
                  id="member-note"
                  rows={4}
                  maxLength={4000}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Section placement, attendance, anything the next director should know."
                />
              )}
              <p className="text-xs text-muted-foreground">
                Only administrators can read this — it is held apart from the member's own profile
                so they cannot see it by reading their own record. They can still ask you what it
                says, and under the Data Privacy Act you should tell them.
              </p>
            </div>

            <div className="rounded-md border border-border p-3">
              <p className="text-sm font-semibold">Password</p>
              <p className="mt-1 text-xs text-muted-foreground">
                You can't set a password for somebody else — send them a link and they choose their
                own. That way nobody but them ever knows it.
              </p>
              <Button
                className="mt-2"
                size="sm"
                variant="outline"
                disabled={!member?.email}
                loading={reset.isPending}
                onClick={() => reset.mutate()}
              >
                <KeyRound aria-hidden /> Send a reset link
              </Button>
            </div>

            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
              <p className="text-sm font-semibold text-destructive">Erase this member</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Clears their name, email, picture and voice part, and deactivates the account. Their
                entries in the activity log stay, without identifying them.
              </p>
              <Button
                className="mt-2"
                size="sm"
                variant="destructive"
                disabled={isSelf}
                onClick={() => setConfirmErase(true)}
              >
                <UserX aria-hidden /> Erase member record
              </Button>
              {isSelf ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  You can't erase your own account from here.
                </p>
              ) : null}
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button loading={save.isPending} onClick={() => save.mutate()}>
              <Save aria-hidden /> Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmErase}
        onOpenChange={setConfirmErase}
        title="Erase this member's record?"
        destructive
        confirmLabel="Erase the record"
        confirmPhrase={member?.display_name || member?.email || undefined}
        loading={erase.isPending}
        onConfirm={() => erase.mutate()}
        description={
          <span className="block space-y-2">
            <span className="block">
              <strong>{member?.display_name || member?.email}</strong> will lose their name, email,
              picture and voice part, and the account will be deactivated. This can't be undone.
            </span>
            <span className="block text-muted-foreground">
              Their sign-in record stays with Supabase, which is why the account can't simply be
              recreated with the same address. If they need that too, remove the user from the
              Supabase dashboard afterwards.
            </span>
          </span>
        }
      />
    </>
  );
}
