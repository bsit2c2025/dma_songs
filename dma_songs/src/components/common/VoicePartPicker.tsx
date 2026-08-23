import * as React from "react";
import { Check, Clock, Loader2, X } from "lucide-react";
import { useVoicePart } from "@/features/voice/VoicePartProvider";
import { useAuth } from "@/features/auth/AuthProvider";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { VoiceClassification } from "@/types/models";

/**
 * The hero picker: eight parts on a four-line stave, in score order from
 * soprano down to bass.
 *
 * Clicking is never silent. A first choice applies straight away; any later
 * change opens a confirmation that says plainly it needs an administrator,
 * because a singer moving section changes the balance of the ensemble and
 * that is a musical decision, not a preference.
 */
export function VoicePartPicker() {
  const { parts, myPart, myPartId, isFirstChoice, pendingRequest, isLoading, isSubmitting, choosePart, cancelRequest } =
    useVoicePart();
  const { status } = useAuth();
  const [confirming, setConfirming] = React.useState<VoiceClassification | null>(null);
  const [note, setNote] = React.useState("");

  if (isLoading) {
    return (
      <div className="flex flex-wrap gap-2" aria-hidden>
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-11 w-28 rounded-full" />
        ))}
      </div>
    );
  }

  const locked = Boolean(pendingRequest);

  function handleClick(part: VoiceClassification) {
    if (part.id === myPartId) return;
    if (isFirstChoice || status !== "authenticated") {
      void choosePart(part.id);
      return;
    }
    setNote("");
    setConfirming(part);
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <div
          className="stave pointer-events-none absolute inset-x-0 top-1/2 h-[37px] -translate-y-1/2 opacity-60"
          aria-hidden
        />
        <fieldset className="relative" disabled={isSubmitting}>
          <legend className="sr-only">Choose your voice part</legend>
          <div className="flex flex-wrap gap-2">
            {parts.map((part) => {
              const mine = part.id === myPartId;
              const requested = pendingRequest?.requested_voice_id === part.id;
              return (
                <button
                  key={part.id}
                  type="button"
                  aria-pressed={mine}
                  disabled={isSubmitting || (locked && !mine)}
                  onClick={() => handleClick(part)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border-2 bg-card px-4 py-2 text-sm font-semibold transition-all",
                    mine
                      ? "shadow-md ring-2 ring-offset-2"
                      : "border-border hover:border-foreground/25 hover:shadow-sm",
                    requested && "border-dashed",
                    locked && !mine && !requested && "opacity-50",
                  )}
                  style={
                    mine
                      ? {
                          borderColor: part.color,
                          color: part.color,
                          backgroundColor: `${part.color}12`,
                          // @ts-expect-error CSS custom property for the ring colour
                          "--tw-ring-color": `${part.color}55`,
                        }
                      : requested
                        ? { borderColor: part.color, color: part.color }
                        : undefined
                  }
                >
                  <span className="font-mono text-[0.7rem] tracking-wider opacity-70">
                    {part.short_code}
                  </span>
                  {part.name}
                  {mine ? <Check className="h-4 w-4" aria-hidden /> : null}
                  {requested ? <Clock className="h-3.5 w-3.5" aria-hidden /> : null}
                </button>
              );
            })}
          </div>
        </fieldset>
      </div>

      {isSubmitting ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Saving…
        </p>
      ) : null}

      {pendingRequest ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-brass/40 bg-brass/5 px-4 py-3">
          <p className="text-sm">
            <Clock className="mr-1.5 inline h-4 w-4 text-brass" aria-hidden />
            Waiting for approval to move to{" "}
            <strong>{pendingRequest.requested?.name ?? "another part"}</strong>. You stay in{" "}
            <strong>{myPart?.name ?? "your current part"}</strong> until an administrator decides.
          </p>
          <Button variant="outline" size="sm" onClick={() => void cancelRequest()} disabled={isSubmitting}>
            <X aria-hidden /> Withdraw
          </Button>
        </div>
      ) : null}

      {!myPart && !pendingRequest ? (
        <p className="text-sm text-muted-foreground">
          {status === "authenticated"
            ? "Pick your part — your first choice is applied straight away."
            : "Pick your part. Sign in to save it to your account."}
        </p>
      ) : null}

      <Dialog open={Boolean(confirming)} onOpenChange={(open) => !open && setConfirming(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request a move to {confirming?.name}?</DialogTitle>
            <DialogDescription>
              You're currently in <strong>{myPart?.name}</strong>. Changing section needs an
              administrator's approval, so this sends a request rather than switching you over. You
              can keep browsing every part's music in the meantime.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="voice-request-note">Anything the administrator should know?</Label>
            <Textarea
              id="voice-request-note"
              rows={3}
              maxLength={500}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Optional — e.g. my range has settled lower this year."
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setConfirming(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              loading={isSubmitting}
              onClick={async () => {
                if (!confirming) return;
                await choosePart(confirming.id, note);
                setConfirming(null);
              }}
            >
              Send request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
