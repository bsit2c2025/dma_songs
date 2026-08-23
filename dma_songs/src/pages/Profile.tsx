import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LogOut, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Field } from "@/components/common/Field";
import { VoicePartPicker } from "@/components/common/VoicePartPicker";
import { VoiceRequestHistory } from "@/components/common/VoiceRequestHistory";
import { useAuth } from "@/features/auth/AuthProvider";
import { useVoicePart } from "@/features/voice/VoicePartProvider";
import { updateOwnProfile } from "@/services/members";
import { signOut } from "@/services/auth";
import { profileFormSchema, type ProfileFormValues } from "@/schemas/profile";
import { errorMessage } from "@/lib/errors";
import { formatDate, initials } from "@/lib/utils";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { queryKeys } from "@/lib/queryKeys";

export default function Profile() {
  useDocumentTitle("Your profile");
  const { user, profile, isAdmin, refreshProfile } = useAuth();
  const { myPart, pendingRequest } = useVoicePart();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    values: {
      displayName: profile?.display_name ?? "",
      voiceClassificationId: profile?.voice_classification_id ?? null,
    },
  });

  const save = useMutation({
    mutationFn: (values: ProfileFormValues) =>
      updateOwnProfile(user!.id, { display_name: values.displayName }),
    onSuccess: async () => {
      await refreshProfile();
      queryClient.invalidateQueries({ queryKey: queryKeys.profile(user?.id) });
      toast.success("Profile saved");
    },
    onError: (error) => toast.error(errorMessage(error, "Your profile didn't save.")),
  });

  const [signingOut, setSigningOut] = React.useState(false);
  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
      navigate("/", { replace: true });
      toast.success("Signed out");
    } catch (error) {
      toast.error(errorMessage(error, "Sign out didn't complete."));
      setSigningOut(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader eyebrow="Your account" title="Profile" />

      <Card>
        <CardHeader className="flex-row items-center gap-4 space-y-0">
          <Avatar className="h-14 w-14">
            {profile?.avatar_url ? <AvatarImage src={profile.avatar_url} alt="" /> : null}
            <AvatarFallback>{initials(profile?.display_name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <CardTitle className="truncate">{profile?.display_name || "Member"}</CardTitle>
            <CardDescription className="truncate">{user?.email}</CardDescription>
          </div>
          {isAdmin ? (
            <Badge className="ml-auto bg-brass text-brass-foreground">
              <ShieldCheck className="h-3 w-3" aria-hidden /> Administrator
            </Badge>
          ) : null}
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit((values) => save.mutate(values))} className="space-y-4" noValidate>
            <Field
              label="Display name"
              htmlFor="display-name"
              error={form.formState.errors.displayName?.message}
              required
            >
              <Input id="display-name" {...form.register("displayName")} />
            </Field>
            <Field label="Email" htmlFor="profile-email" hint="Email changes are handled by your sign-in provider.">
              <Input id="profile-email" value={user?.email ?? ""} readOnly disabled />
            </Field>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" loading={save.isPending} disabled={!form.formState.isDirty}>
                Save changes
              </Button>
              <p className="text-xs text-muted-foreground">Member since {formatDate(profile?.created_at)}</p>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your voice part</CardTitle>
          <CardDescription>
            {myPart
              ? pendingRequest
                ? `You sing ${myPart.name}. A move to ${pendingRequest.requested?.name ?? "another part"} is waiting for approval.`
                : `You sing ${myPart.name}. Moving to a different section needs an administrator's approval — you can still browse every part's music.`
              : "Pick the part you sing. Your first choice is applied straight away."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <VoicePartPicker />
          <VoiceRequestHistory />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Session</CardTitle>
          <CardDescription>Signing out clears this session on this device.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={handleSignOut} loading={signingOut}>
            <LogOut aria-hidden /> Sign out
          </Button>
          {isAdmin ? (
            <Button variant="ghost" onClick={() => navigate("/admin")}>
              Open the dashboard
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
