import * as React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { Field } from "@/components/common/Field";
import { ImageField } from "@/components/common/ImageField";
import { RichTextEditor } from "@/components/common/RichTextEditor";
import { AnnouncementCard } from "@/components/common/AnnouncementCard";
import { ErrorState } from "@/components/common/ErrorState";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useAnnouncement } from "@/hooks/useAnnouncements";
import { createAnnouncement, updateAnnouncement } from "@/services/announcements";
import { announcementFormSchema, type AnnouncementFormValues } from "@/schemas/announcement";
import { errorMessage } from "@/lib/errors";
import { fromLocalInputValue, toLocalInputValue } from "@/lib/utils";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

const EMPTY: AnnouncementFormValues = {
  title: "",
  content: "",
  imageUrl: "",
  linkUrl: "",
  linkLabel: "",
  isPublished: false,
  isPinned: false,
  priority: 0,
  startsAt: null,
  endsAt: null,
};

export default function AdminAnnouncementEditor() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const existing = useAnnouncement(id);
  useDocumentTitle(isEdit ? "Edit announcement" : "New announcement");

  const form = useForm<AnnouncementFormValues>({
    resolver: zodResolver(announcementFormSchema),
    defaultValues: EMPTY,
    mode: "onBlur",
  });

  React.useEffect(() => {
    const announcement = existing.data;
    if (!announcement) return;
    form.reset({
      title: announcement.title,
      content: announcement.content,
      imageUrl: announcement.image_url ?? "",
      linkUrl: announcement.link_url ?? "",
      linkLabel: announcement.link_label ?? "",
      isPublished: announcement.is_published,
      isPinned: announcement.is_pinned,
      priority: announcement.priority,
      startsAt: announcement.starts_at,
      endsAt: announcement.ends_at,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing.data]);

  const save = useMutation({
    mutationFn: (values: AnnouncementFormValues) => {
      const parsed = announcementFormSchema.parse(values);
      return isEdit ? updateAnnouncement(id!, parsed) : createAnnouncement(parsed);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "announcements"] });
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
      toast.success(isEdit ? "Announcement saved" : "Announcement created");
      navigate("/admin/announcements");
    },
    onError: (error) => toast.error(errorMessage(error, "The announcement didn't save.")),
  });

  const values = form.watch();
  const errors = form.formState.errors;

  if (isEdit && existing.isLoading) return <Skeleton className="h-96 w-full" />;
  if (isEdit && existing.isError) {
    return <ErrorState title="This announcement didn't load" error={existing.error} onRetry={existing.refetch} />;
  }

  return (
    <form onSubmit={form.handleSubmit((next) => save.mutate(next))} noValidate className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/admin/announcements">
          <ArrowLeft aria-hidden /> Back to announcements
        </Link>
      </Button>

      <PageHeader
        eyebrow={isEdit ? "Edit announcement" : "New announcement"}
        title={values.title || "Announcement"}
        actions={
          <Button type="submit" loading={save.isPending}>
            {values.isPublished ? "Save and publish" : "Save draft"}
          </Button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.6fr,1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Message</CardTitle>
              <CardDescription>
                Formatting comes from the toolbar. Pasted text arrives as plain text and everything is
                sanitized before it is saved.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="Title" htmlFor="announcement-title" error={errors.title?.message} required>
                <Input id="announcement-title" {...form.register("title")} />
              </Field>

              <div className="space-y-1.5">
                <Label htmlFor="announcement-content">
                  Message <span className="text-destructive">*</span>
                </Label>
                <RichTextEditor
                  id="announcement-content"
                  ariaLabel="Announcement message"
                  value={values.content}
                  error={Boolean(errors.content)}
                  onChange={(html) => form.setValue("content", html, { shouldDirty: true, shouldValidate: true })}
                />
                {errors.content ? (
                  <p className="text-xs font-medium text-destructive">{errors.content.message}</p>
                ) : null}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Link address"
                  htmlFor="link-url"
                  error={errors.linkUrl?.message}
                  hint="Optional. https://… or an in-app path like /songs."
                >
                  <Input id="link-url" {...form.register("linkUrl")} />
                </Field>
                <Field label="Button label" htmlFor="link-label" error={errors.linkLabel?.message}>
                  <Input id="link-label" placeholder="View the schedule" {...form.register("linkLabel")} />
                </Field>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Image</CardTitle>
              <CardDescription>Optional banner shown above the message.</CardDescription>
            </CardHeader>
            <CardContent>
              <ImageField
                id="announcement-image"
                bucket="announcement-images"
                value={values.imageUrl || null}
                onChange={(value) => form.setValue("imageUrl", value ?? "", { shouldDirty: true })}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
              <CardDescription>Exactly what members will see, sanitized the same way.</CardDescription>
            </CardHeader>
            <CardContent>
              <AnnouncementCard
                announcement={{
                  id: "preview",
                  title: values.title || "Announcement title",
                  content: values.content || "<p>Your message appears here.</p>",
                  image_url: values.imageUrl || null,
                  link_url: values.linkUrl || null,
                  link_label: values.linkLabel || null,
                  is_published: values.isPublished ?? false,
                  is_pinned: values.isPinned ?? false,
                  priority: Number(values.priority ?? 0),
                  starts_at: values.startsAt ?? null,
                  ends_at: values.endsAt ?? null,
                  created_by: null,
                  updated_by: null,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  isLive: true,
                }}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Visibility</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Label htmlFor="published-switch">Published</Label>
                  <p className="mt-1 text-xs text-muted-foreground">Drafts are only visible here.</p>
                </div>
                <Switch
                  id="published-switch"
                  checked={values.isPublished ?? false}
                  onCheckedChange={(checked) => form.setValue("isPublished", checked, { shouldDirty: true })}
                />
              </div>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Label htmlFor="pinned-switch">Pin to the top</Label>
                  <p className="mt-1 text-xs text-muted-foreground">Highlighted above everything else.</p>
                </div>
                <Switch
                  id="pinned-switch"
                  checked={values.isPinned ?? false}
                  onCheckedChange={(checked) => form.setValue("isPinned", checked, { shouldDirty: true })}
                />
              </div>
              <Field
                label="Priority"
                htmlFor="priority"
                error={errors.priority?.message}
                hint="0–100. Higher shows first among unpinned announcements."
              >
                <Input id="priority" type="number" min={0} max={100} {...form.register("priority")} />
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Schedule</CardTitle>
              <CardDescription>
                Outside this window the announcement is hidden — enforced by the database, not just the UI.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="Show from" htmlFor="starts-at" error={errors.startsAt?.message}>
                <Input
                  id="starts-at"
                  type="datetime-local"
                  value={toLocalInputValue(values.startsAt)}
                  onChange={(event) =>
                    form.setValue("startsAt", fromLocalInputValue(event.target.value), { shouldDirty: true })
                  }
                />
              </Field>
              <Field label="Hide after" htmlFor="ends-at" error={errors.endsAt?.message}>
                <Input
                  id="ends-at"
                  type="datetime-local"
                  value={toLocalInputValue(values.endsAt)}
                  onChange={(event) =>
                    form.setValue("endsAt", fromLocalInputValue(event.target.value), { shouldDirty: true })
                  }
                />
              </Field>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
        <Button asChild variant="ghost" type="button">
          <Link to="/admin/announcements">Cancel</Link>
        </Button>
        <Button type="submit" loading={save.isPending}>
          {isEdit ? "Save changes" : "Create announcement"}
        </Button>
      </div>
    </form>
  );
}
