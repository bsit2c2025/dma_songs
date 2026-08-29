import * as React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { transformingResolver } from "@/lib/form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CalendarDays, Users } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useAnnouncement } from "@/hooks/useAnnouncements";
import { createAnnouncement, updateAnnouncement } from "@/services/announcements";
import {
  announcementFormSchema,
  type AnnouncementFormOutput,
  type AnnouncementFormValues,
} from "@/schemas/announcement";
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
  isEvent: false,
  eventStartsAt: null,
  eventEndsAt: null,
  callTime: "",
  venue: "",
  address: "",
  dressCode: "",
  whatToBring: "",
  collectRsvp: true,
  rsvpDeadline: null,
};

export default function AdminAnnouncementEditor() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const existing = useAnnouncement(id);
  useDocumentTitle(isEdit ? "Edit announcement" : "New announcement");

  // Third generic = the schema's output type; handleSubmit receives values that
  // the resolver has already transformed, so they must not be parsed again.
  const form = useForm<AnnouncementFormValues, unknown, AnnouncementFormOutput>({
    resolver: transformingResolver(announcementFormSchema),
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
      isEvent: announcement.is_event,
      eventStartsAt: announcement.event_starts_at,
      eventEndsAt: announcement.event_ends_at,
      callTime: announcement.call_time ?? "",
      venue: announcement.venue ?? "",
      address: announcement.address ?? "",
      dressCode: announcement.dress_code ?? "",
      whatToBring: announcement.what_to_bring ?? "",
      collectRsvp: announcement.collect_rsvp,
      rsvpDeadline: announcement.rsvp_deadline,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing.data]);

  const save = useMutation({
    mutationFn: (values: AnnouncementFormOutput) =>
      isEdit ? updateAnnouncement(id!, values) : createAnnouncement(values),
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
                  is_event: values.isEvent ?? false,
                  event_starts_at: values.eventStartsAt ?? null,
                  event_ends_at: values.eventEndsAt ?? null,
                  call_time: values.callTime || null,
                  venue: values.venue || null,
                  address: values.address || null,
                  dress_code: values.dressCode || null,
                  what_to_bring: values.whatToBring || null,
                  collect_rsvp: values.collectRsvp ?? true,
                  rsvp_deadline: values.rsvpDeadline ?? null,
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

          <Card className={values.isEvent ? "border-brass/40" : undefined}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-brass" aria-hidden /> Event details
              </CardTitle>
              <CardDescription>
                Turn this on for a concert, rehearsal or call. Members see the date, place and what
                to wear, and can say whether they're coming.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Label htmlFor="is-event">This is an event</Label>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Adds it to the events list on the home page.
                  </p>
                </div>
                <Switch
                  id="is-event"
                  checked={values.isEvent ?? false}
                  onCheckedChange={(checked) =>
                    form.setValue("isEvent", checked, { shouldDirty: true, shouldValidate: true })
                  }
                />
              </div>

              {values.isEvent ? (
                <div className="space-y-4 border-t border-border pt-4">
                  <Field
                    label="Starts"
                    htmlFor="event-starts"
                    error={errors.eventStartsAt?.message}
                    required
                  >
                    <Input
                      id="event-starts"
                      type="datetime-local"
                      value={toLocalInputValue(values.eventStartsAt)}
                      onChange={(event) =>
                        form.setValue("eventStartsAt", fromLocalInputValue(event.target.value), {
                          shouldDirty: true,
                          shouldValidate: true,
                        })
                      }
                    />
                  </Field>

                  <Field label="Ends" htmlFor="event-ends" error={errors.eventEndsAt?.message}>
                    <Input
                      id="event-ends"
                      type="datetime-local"
                      value={toLocalInputValue(values.eventEndsAt)}
                      onChange={(event) =>
                        form.setValue("eventEndsAt", fromLocalInputValue(event.target.value), {
                          shouldDirty: true,
                          shouldValidate: true,
                        })
                      }
                    />
                  </Field>

                  <Field
                    label="Call time"
                    htmlFor="call-time"
                    error={errors.callTime?.message}
                    hint="When to actually turn up, which is rarely the start time."
                  >
                    <Input id="call-time" placeholder="3:00 PM at the lobby" {...form.register("callTime")} />
                  </Field>

                  <Field label="Venue" htmlFor="venue" error={errors.venue?.message}>
                    <Input id="venue" placeholder="DLL Auditorium" {...form.register("venue")} />
                  </Field>

                  <Field label="Address" htmlFor="address" error={errors.address?.message}>
                    <Textarea id="address" rows={2} {...form.register("address")} />
                  </Field>

                  <Field
                    label="What to wear"
                    htmlFor="dress-code"
                    error={errors.dressCode?.message}
                    hint="Be specific. “Formal” means eight different things to eight people."
                  >
                    <Textarea
                      id="dress-code"
                      rows={2}
                      placeholder="White long-sleeve polo, black slacks, black closed shoes."
                      {...form.register("dressCode")}
                    />
                  </Field>

                  <Field label="What to bring" htmlFor="what-to-bring" error={errors.whatToBring?.message}>
                    <Textarea
                      id="what-to-bring"
                      rows={2}
                      placeholder="Folder, water bottle, ID."
                      {...form.register("whatToBring")}
                    />
                  </Field>

                  <Field
                    label="Replies close"
                    htmlFor="rsvp-deadline"
                    error={errors.rsvpDeadline?.message}
                    hint="Optional. After this, members can't change their answer but you still can."
                  >
                    <Input
                      id="rsvp-deadline"
                      type="datetime-local"
                      value={toLocalInputValue(values.rsvpDeadline)}
                      onChange={(event) =>
                        form.setValue("rsvpDeadline", fromLocalInputValue(event.target.value), {
                          shouldDirty: true,
                        })
                      }
                    />
                  </Field>

                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <Label htmlFor="collect-rsvp">Ask members if they're coming</Label>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Shows going / can't go / not sure, and you get the list.
                      </p>
                    </div>
                    <Switch
                      id="collect-rsvp"
                      checked={values.collectRsvp ?? true}
                      onCheckedChange={(checked) =>
                        form.setValue("collectRsvp", checked, { shouldDirty: true })
                      }
                    />
                  </div>

                  {isEdit ? (
                    <Button asChild variant="outline" type="button" className="w-full">
                      <Link to={`/admin/events/${id}`}>
                        <Users aria-hidden /> See who's coming
                      </Link>
                    </Button>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Save the event first, then you can see who has replied.
                    </p>
                  )}
                </div>
              ) : null}
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
