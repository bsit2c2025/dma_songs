import * as React from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { ArrowRight, Check, HelpCircle, Music4 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/features/auth/AuthProvider";
import { completeOnboarding } from "@/services/onboarding";
import { errorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import type { VoiceFamily } from "@/types/database";

/**
 * The voices a new singer can actually name about themselves.
 *
 * The eight divided parts are a director's vocabulary, not a newcomer's.
 * Somebody who has never been auditioned can usually say "I sing low for a
 * woman"; almost nobody can say "Alto 2" on their first day. So the question
 * asked here is the one that can be answered honestly, and the level is left
 * to whoever hears them sing.
 */
const VOICES: { value: VoiceFamily; label: string; hint: string }[] = [
  { value: "soprano", label: "Soprano", hint: "The highest voice. Comfortable above the stave." },
  { value: "alto", label: "Alto", hint: "Lower women's voice. The harmony under the melody." },
  { value: "tenor", label: "Tenor", hint: "Higher men's voice. Often carries the melody in hymns." },
  { value: "bass", label: "Bass", hint: "The lowest voice. The foundation of the chord." },
];

export default function Welcome() {
  useDocumentTitle("Welcome");
  const navigate = useNavigate();
  const { profile, status, refreshProfile } = useAuth();

  const [step, setStep] = React.useState(0);
  const [name, setName] = React.useState("");
  const [family, setFamily] = React.useState<VoiceFamily | null>(null);
  const [unsure, setUnsure] = React.useState(false);

  React.useEffect(() => {
    if (profile?.display_name) setName(profile.display_name);
  }, [profile?.display_name]);

  const finish = useMutation({
    mutationFn: () => completeOnboarding({ displayName: name, family, unsure }),
    onSuccess: async () => {
      await refreshProfile();
      toast.success("You're all set");
      navigate("/", { replace: true });
    },
    onError: (error) => toast.error(errorMessage(error, "That didn't save.")),
  });

  if (status === "loading") return null;
  if (status !== "authenticated") return <Navigate to="/login" replace />;
  // Never re-run for somebody who has already been through it.
  if (profile?.onboarded_at) return <Navigate to="/" replace />;

  return (
    <div className="mx-auto max-w-xl space-y-6 py-6">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-brass">
          Step {step + 1} of 2
        </p>
        <h1 className="mt-2 text-3xl sm:text-4xl">
          {step === 0 ? "Welcome to the choir" : "What do you sing?"}
        </h1>
      </div>

      {/* A two-segment progress bar, because two steps do not need a widget. */}
      <div className="flex gap-2" aria-hidden>
        {[0, 1].map((index) => (
          <span
            key={index}
            className={cn("h-1 flex-1 rounded-full", index <= step ? "bg-primary" : "bg-muted")}
          />
        ))}
      </div>

      {step === 0 ? (
        <Card>
          <CardContent className="space-y-4 p-6">
            <p className="text-muted-foreground">
              Two quick questions and you're in. First — what should the rest of the choir call you?
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="welcome-name">Your name</Label>
              <Input
                id="welcome-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Maria Santos"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                This is what appears on attendance lists and next to your voice part.
              </p>
            </div>
            <Button
              className="w-full"
              disabled={name.trim().length < 2}
              onClick={() => setStep(1)}
            >
              Continue <ArrowRight aria-hidden />
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Pick the voice you sing. Your section leader can move you to a specific part later —
            Soprano 1, Alto 2 and so on — once they've heard you.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            {VOICES.map((voice) => {
              const selected = family === voice.value && !unsure;
              return (
                <button
                  key={voice.value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => {
                    setFamily(voice.value);
                    setUnsure(false);
                  }}
                  className={cn(
                    "rounded-lg border-2 p-4 text-left transition-colors",
                    selected ? "border-primary bg-primary/5" : "border-border hover:bg-accent",
                  )}
                >
                  <span className="flex items-center gap-2 font-semibold">
                    <Music4 className="h-4 w-4 text-brass" aria-hidden />
                    {voice.label}
                    {selected ? <Check className="ml-auto h-4 w-4 text-primary" aria-hidden /> : null}
                  </span>
                  <span className="mt-1 block text-sm text-muted-foreground">{voice.hint}</span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            aria-pressed={unsure}
            onClick={() => {
              setUnsure(true);
              setFamily(null);
            }}
            className={cn(
              "w-full rounded-lg border-2 p-4 text-left transition-colors",
              unsure ? "border-brass bg-brass/5" : "border-dashed border-border hover:bg-accent",
            )}
          >
            <span className="flex items-center gap-2 font-semibold">
              <HelpCircle className="h-4 w-4 text-brass" aria-hidden />
              I'm not sure — let the director decide
              {unsure ? <Check className="ml-auto h-4 w-4 text-brass" aria-hidden /> : null}
            </span>
            <span className="mt-1 block text-sm text-muted-foreground">
              Perfectly normal on day one. You'll go on the list for the director to place, and
              nothing else is held up in the meantime.
            </span>
          </button>

          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={() => setStep(0)}>
              Back
            </Button>
            <Button
              className="flex-1"
              loading={finish.isPending}
              disabled={!family && !unsure}
              onClick={() => finish.mutate()}
            >
              Finish
            </Button>
          </div>

          <button
            type="button"
            className="w-full text-center text-sm text-muted-foreground underline"
            onClick={() => {
              setFamily(null);
              setUnsure(true);
              finish.mutate();
            }}
          >
            Skip for now
          </button>
        </div>
      )}
    </div>
  );
}
