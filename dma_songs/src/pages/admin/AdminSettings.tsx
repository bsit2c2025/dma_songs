import * as React from "react";
import { useForm } from "react-hook-form";
import { transformingResolver } from "@/lib/form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { Field } from "@/components/common/Field";
import { ImageField } from "@/components/common/ImageField";
import { ErrorState } from "@/components/common/ErrorState";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useSettings } from "@/hooks/useSettings";
import { saveSettings, settingBoolean, settingNumber, settingString } from "@/services/settings";
import {
  settingsFormSchema,
  type SettingsFormOutput,
  type SettingsFormValues,
} from "@/schemas/settings";
import { errorMessage } from "@/lib/errors";
import { queryKeys } from "@/lib/queryKeys";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export default function AdminSettings() {
  useDocumentTitle("Settings");
  const queryClient = useQueryClient();
  const { data: settings, isLoading, isError, error, refetch } = useSettings();

  const form = useForm<SettingsFormValues, unknown, SettingsFormOutput>({
    resolver: transformingResolver(settingsFormSchema),
    defaultValues: {
      appName: "DLL Music and Arts",
      tagline: "",
      organization: "",
      logoUrl: "/logo.svg",
      contactEmail: "",
      songsPageSize: 12,
      announcementsHomeLimit: 3,
      showAnnouncementBanner: true,
    },
  });

  React.useEffect(() => {
    if (!settings) return;
    form.reset({
      appName: settingString(settings, "app.name", "DLL Music and Arts"),
      tagline: settingString(settings, "app.tagline", ""),
      organization: settingString(settings, "app.organization", ""),
      logoUrl: settingString(settings, "app.logo_url", "/logo.svg"),
      contactEmail: settingString(settings, "app.contact_email", ""),
      songsPageSize: settingNumber(settings, "songs.page_size", 12),
      announcementsHomeLimit: settingNumber(settings, "announcements.home_limit", 3),
      showAnnouncementBanner: settingBoolean(settings, "announcements.show_banner", true),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  const save = useMutation({
    mutationFn: (parsed: SettingsFormOutput) => {
      return saveSettings({
        "app.name": parsed.appName,
        "app.tagline": parsed.tagline || null,
        "app.organization": parsed.organization || null,
        "app.logo_url": parsed.logoUrl || "/logo.svg",
        "app.contact_email": parsed.contactEmail || null,
        "songs.page_size": parsed.songsPageSize,
        "announcements.home_limit": parsed.announcementsHomeLimit,
        "announcements.show_banner": parsed.showAnnouncementBanner,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings });
      toast.success("Settings saved");
    },
    onError: (error) => toast.error(errorMessage(error, "Settings didn't save.")),
  });

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (isError) return <ErrorState title="Settings didn't load" error={error} onRetry={refetch} />;

  const errors = form.formState.errors;
  const logoUrl = form.watch("logoUrl");

  return (
    <form onSubmit={form.handleSubmit((values) => save.mutate(values))} noValidate className="space-y-6">
      <PageHeader
        eyebrow="System"
        title="Settings"
        description="Branding and a few library defaults. Only administrators can read or change these."
        actions={
          <Button type="submit" loading={save.isPending}>
            Save settings
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Identity</CardTitle>
            <CardDescription>Shown in the header, footer and browser tab.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Application name" htmlFor="app-name" error={errors.appName?.message} required>
              <Input id="app-name" {...form.register("appName")} />
            </Field>
            <Field label="Tagline" htmlFor="tagline" error={errors.tagline?.message}>
              <Input id="tagline" {...form.register("tagline")} />
            </Field>
            <Field label="Organization" htmlFor="organization" error={errors.organization?.message}>
              <Input id="organization" {...form.register("organization")} />
            </Field>
            <Field label="Contact email" htmlFor="contact-email" error={errors.contactEmail?.message}>
              <Input id="contact-email" type="email" {...form.register("contactEmail")} />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Logo</CardTitle>
            <CardDescription>
              Square artwork works best. It's always displayed with its aspect ratio preserved.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ImageField
              id="logo"
              bucket="branding"
              value={logoUrl || null}
              onChange={(value) => form.setValue("logoUrl", value ?? "", { shouldDirty: true })}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Song library</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field
              label="Songs per page"
              htmlFor="page-size"
              error={errors.songsPageSize?.message}
              hint="Between 6 and 48."
            >
              <Input id="page-size" type="number" min={6} max={48} {...form.register("songsPageSize")} />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Announcements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field
              label="Shown on the home page"
              htmlFor="home-limit"
              error={errors.announcementsHomeLimit?.message}
              hint="Between 1 and 10."
            >
              <Input id="home-limit" type="number" min={1} max={10} {...form.register("announcementsHomeLimit")} />
            </Field>
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor="banner-switch">Highlight pinned announcements</Label>
                <p className="mt-1 text-xs text-muted-foreground">
                  Gives pinned posts the brass border on the home page.
                </p>
              </div>
              <Switch
                id="banner-switch"
                checked={form.watch("showAnnouncementBanner")}
                onCheckedChange={(checked) =>
                  form.setValue("showAnnouncementBanner", checked, { shouldDirty: true })
                }
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end border-t border-border pt-4">
        <Button type="submit" loading={save.isPending}>
          Save settings
        </Button>
      </div>
    </form>
  );
}
