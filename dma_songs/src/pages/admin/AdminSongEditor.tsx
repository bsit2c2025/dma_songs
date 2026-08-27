import * as React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useFieldArray, useForm } from "react-hook-form";
import { transformingResolver } from "@/lib/form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Eye, Plus, ShieldCheck, Trash2, Video } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { Field } from "@/components/common/Field";
import { ImageField } from "@/components/common/ImageField";
import { ErrorState } from "@/components/common/ErrorState";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useSong } from "@/hooks/useSongs";
import { useVoiceClassifications } from "@/hooks/useVoiceClassifications";
import { saveSong } from "@/services/songs";
import { songFormSchema, type SongFormOutput, type SongFormValues } from "@/schemas/song";
import { RIGHTS_BASES, VOICE_FAMILIES } from "@/types/models";
import type { VoiceFamily } from "@/types/database";
import type { VoiceClassification } from "@/types/models";
import { extractYouTubeId, thumbnailFromVideoId } from "@/lib/youtube";
import { errorMessage } from "@/lib/errors";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

const GENERAL = "__general__";

/** Which whole voices a stored set of divided parts adds up to. */
function familiesFromParts(parts: VoiceClassification[]): VoiceFamily[] {
  const found = new Set<VoiceFamily>();
  parts.forEach((part) => {
    if (part.family) found.add(part.family);
  });
  return VOICE_FAMILIES.map((f) => f.value).filter((value) => found.has(value));
}

const EMPTY: SongFormValues = {
  title: "",
  composer: "",
  arranger: "",
  description: "",
  category: "",
  lyrics: "",
  notes: "",
  thumbnailUrl: "",
  status: "active",
  partMode: "simple",
  voiceFamilies: [],
  voiceClassificationIds: [],
  rightsConfirmed: false,
  rightsBasis: null,
  rightsHolder: "",
  rightsNote: "",
  videos: [],
};

export default function AdminSongEditor() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const parts = useVoiceClassifications(true);
  const existing = useSong(id);
  useDocumentTitle(isEdit ? "Edit song" : "Add song");

  // The third generic is the schema's OUTPUT type. With a resolver, react-hook-form
  // hands the *transformed* values to handleSubmit — empty strings have already
  // become nulls. Re-parsing them would fail, because `null` is not valid input
  // to a schema that produces `null`.
  const form = useForm<SongFormValues, unknown, SongFormOutput>({
    resolver: transformingResolver(songFormSchema),
    defaultValues: EMPTY,
    mode: "onBlur",
  });

  const videos = useFieldArray({ control: form.control, name: "videos" });

  // Load the existing song into the form once it arrives.
  React.useEffect(() => {
    const song = existing.data;
    if (!song) return;
    form.reset({
      title: song.title,
      composer: song.composer ?? "",
      arranger: song.arranger ?? "",
      description: song.description ?? "",
      category: song.category ?? "",
      lyrics: song.lyrics ?? "",
      notes: song.notes ?? "",
      thumbnailUrl: song.thumbnail_url ?? "",
      status: song.status,
      partMode: song.part_mode,
      voiceFamilies: familiesFromParts(song.voiceClassifications),
      voiceClassificationIds: song.voiceClassifications.map((part) => part.id),
      rightsConfirmed: song.rights_confirmed,
      rightsBasis: (song.rights_basis as SongFormValues["rightsBasis"]) ?? null,
      rightsHolder: song.rights_holder ?? "",
      rightsNote: song.rights_note ?? "",
      videos: song.videos.map((video) => ({
        id: video.id,
        voiceClassificationId: video.voice_classification_id,
        voiceFamily: video.voice_family,
        url: video.youtube_url,
        label: video.label ?? "",
      })),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing.data]);

  const save = useMutation({
    mutationFn: (values: SongFormOutput) => saveSong(values, id),
    onSuccess: (savedId) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "songs"] });
      queryClient.invalidateQueries({ queryKey: ["songs"] });
      queryClient.invalidateQueries({ queryKey: ["song", savedId] });
      queryClient.invalidateQueries({ queryKey: ["song-categories"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
      toast.success(isEdit ? "Song saved" : "Song added");
      navigate("/admin/songs");
    },
    onError: (error) => toast.error(errorMessage(error, "The song didn't save.")),
  });

  const partMode = form.watch("partMode") ?? "simple";
  const selectedParts = form.watch("voiceClassificationIds") ?? [];
  const selectedFamilies = form.watch("voiceFamilies") ?? [];
  const lyrics = form.watch("lyrics") ?? "";
  const rightsBasis = form.watch("rightsBasis");
  const needsRights = lyrics.trim().length > 0;
  const status = form.watch("status");
  const thumbnailUrl = form.watch("thumbnailUrl");
  const errors = form.formState.errors;

  if (isEdit && existing.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (isEdit && existing.isError) {
    return <ErrorState title="This song didn't load" error={existing.error} onRetry={existing.refetch} />;
  }

  function togglePart(partId: string, checked: boolean) {
    const next = checked
      ? [...selectedParts, partId]
      : selectedParts.filter((value) => value !== partId);
    form.setValue("voiceClassificationIds", next, { shouldDirty: true, shouldValidate: true });

    // Drop any video that was attached to a part the song no longer covers.
    if (!checked) {
      const stale = (form.getValues("videos") ?? [])
        .map((video, index) => ({ video, index }))
        .filter(({ video }) => video.voiceClassificationId === partId)
        .map(({ index }) => index)
        .reverse();
      stale.forEach((index) => videos.remove(index));
    }
  }

  const availableForVideo = (parts.data ?? []).filter((part) => selectedParts.includes(part.id));
  const availableFamilies = VOICE_FAMILIES.filter((family) =>
    selectedFamilies.includes(family.value),
  );

  function toggleFamily(family: VoiceFamily, checked: boolean) {
    const next = checked
      ? [...selectedFamilies, family]
      : selectedFamilies.filter((value) => value !== family);
    form.setValue("voiceFamilies", next, { shouldDirty: true, shouldValidate: true });

    if (!checked) {
      const stale = (form.getValues("videos") ?? [])
        .map((video, index) => ({ video, index }))
        .filter(({ video }) => video.voiceFamily === family)
        .map(({ index }) => index)
        .reverse();
      stale.forEach((index) => videos.remove(index));
    }
  }

  return (
    <form onSubmit={form.handleSubmit((values) => save.mutate(values))} noValidate className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/admin/songs">
          <ArrowLeft aria-hidden /> Back to songs
        </Link>
      </Button>

      <PageHeader
        eyebrow={isEdit ? "Edit song" : "New song"}
        title={form.watch("title") || (isEdit ? "Edit song" : "Add a song")}
        actions={
          <>
            {isEdit ? (
              <Button asChild variant="outline" type="button">
                <Link to={`/songs/${id}`} target="_blank">
                  <Eye aria-hidden /> Preview
                </Link>
              </Button>
            ) : null}
            <Button type="submit" loading={save.isPending}>
              {isEdit ? "Save changes" : "Add song"}
            </Button>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.6fr,1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="Title" htmlFor="title" error={errors.title?.message} required>
                <Input id="title" {...form.register("title")} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Composer" htmlFor="composer" error={errors.composer?.message}>
                  <Input id="composer" {...form.register("composer")} />
                </Field>
                <Field label="Arranger" htmlFor="arranger" error={errors.arranger?.message}>
                  <Input id="arranger" {...form.register("arranger")} />
                </Field>
              </div>
              <Field
                label="Category"
                htmlFor="category"
                error={errors.category?.message}
                hint="Free text — e.g. Liturgical, Patriotic, Folk, Contest piece."
              >
                <Input id="category" {...form.register("category")} />
              </Field>
              <Field label="Description" htmlFor="description" error={errors.description?.message}>
                <Textarea id="description" rows={3} {...form.register("description")} />
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Lyrics and notes</CardTitle>
              <CardDescription>Shown on the song page under the practice video.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="Lyrics" htmlFor="lyrics" error={errors.lyrics?.message}>
                <Textarea id="lyrics" rows={10} className="font-mono text-[13px]" {...form.register("lyrics")} />
              </Field>
              <Field
                label="Rehearsal notes"
                htmlFor="notes"
                error={errors.notes?.message}
                hint="Breath marks, dynamics, anything the section should watch for."
              >
                <Textarea id="notes" rows={4} {...form.register("notes")} />
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5 text-brass" aria-hidden /> Practice videos
              </CardTitle>
              <CardDescription>
                One video per voice, plus an optional recording for the full ensemble. Paste a
                normal YouTube or youtu.be link — only the video id is stored.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {videos.fields.length === 0 ? (
                <p className="rounded-md border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                  No videos yet. Singers will still see the lyrics and notes.
                </p>
              ) : null}

              {videos.fields.map((field, index) => {
                const url = form.watch(`videos.${index}.url`);
                const videoId = url ? extractYouTubeId(url) : null;
                const videoErrors = errors.videos?.[index];

                return (
                  <div key={field.id} className="rounded-md border border-border p-4">
                    <div className="flex items-start gap-4">
                      <div className="hidden h-14 w-24 shrink-0 overflow-hidden rounded bg-muted sm:block">
                        {videoId ? (
                          <img src={thumbnailFromVideoId(videoId, "mq")} alt="" className="h-full w-full object-cover" />
                        ) : null}
                      </div>

                      <div className="min-w-0 flex-1 space-y-3">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <Field
                            label="Voice part"
                            htmlFor={`video-part-${index}`}
                            error={videoErrors?.voiceClassificationId?.message}
                          >
                            <Select
                              value={
                                form.watch(`videos.${index}.voiceFamily`) ??
                                form.watch(`videos.${index}.voiceClassificationId`) ??
                                GENERAL
                              }
                              onValueChange={(value) => {
                                const isFamily = VOICE_FAMILIES.some((f) => f.value === value);
                                form.setValue(
                                  `videos.${index}.voiceFamily`,
                                  isFamily ? (value as VoiceFamily) : null,
                                  { shouldDirty: true, shouldValidate: true },
                                );
                                form.setValue(
                                  `videos.${index}.voiceClassificationId`,
                                  isFamily || value === GENERAL ? null : value,
                                  { shouldDirty: true, shouldValidate: true },
                                );
                              }}
                            >
                              <SelectTrigger id={`video-part-${index}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={GENERAL}>Full ensemble</SelectItem>
                                {partMode === "simple"
                                  ? availableFamilies.map((family) => (
                                      <SelectItem key={family.value} value={family.value}>
                                        {family.label}
                                      </SelectItem>
                                    ))
                                  : availableForVideo.map((part) => (
                                      <SelectItem key={part.id} value={part.id}>
                                        {part.name}
                                      </SelectItem>
                                    ))}
                              </SelectContent>
                            </Select>
                          </Field>

                          <Field
                            label="Label"
                            htmlFor={`video-label-${index}`}
                            error={videoErrors?.label?.message}
                            hint="Optional, e.g. “Slow practice”."
                          >
                            <Input id={`video-label-${index}`} {...form.register(`videos.${index}.label`)} />
                          </Field>
                        </div>

                        <Field
                          label="YouTube link"
                          htmlFor={`video-url-${index}`}
                          error={videoErrors?.url?.message}
                          required
                        >
                          <Input
                            id={`video-url-${index}`}
                            placeholder="https://www.youtube.com/watch?v=…"
                            {...form.register(`videos.${index}.url`)}
                          />
                        </Field>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => videos.remove(index)}
                        aria-label="Remove this video"
                      >
                        <Trash2 className="text-destructive" />
                      </Button>
                    </div>
                  </div>
                );
              })}

              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  videos.append({ voiceClassificationId: null, voiceFamily: null, url: "", label: "" })
                }
              >
                <Plus aria-hidden /> Add a video
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Availability</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Label htmlFor="status-switch">Show in the library</Label>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Disabled songs stay in the database but disappear for members.
                  </p>
                </div>
                <Switch
                  id="status-switch"
                  checked={status === "active"}
                  onCheckedChange={(checked) =>
                    form.setValue("status", checked ? "active" : "disabled", { shouldDirty: true })
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Voice parts</CardTitle>
              <CardDescription>
                Most arrangements are plain SATB. Use the detailed list only when the parts really
                are divided.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs
                value={partMode}
                onValueChange={(value) =>
                  form.setValue("partMode", value as "simple" | "detailed", {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
              >
                <TabsList className="w-full">
                  <TabsTrigger value="simple" className="flex-1">
                    SATB
                  </TabsTrigger>
                  <TabsTrigger value="detailed" className="flex-1">
                    Divided parts
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {partMode === "simple" ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        form.setValue(
                          "voiceFamilies",
                          VOICE_FAMILIES.map((family) => family.value),
                          { shouldDirty: true, shouldValidate: true },
                        )
                      }
                    >
                      Select SATB
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        form.setValue("voiceFamilies", [], { shouldDirty: true, shouldValidate: true })
                      }
                    >
                      Clear
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {VOICE_FAMILIES.map((family) => {
                      const checked = selectedFamilies.includes(family.value);
                      return (
                        <label
                          key={family.value}
                          className={cn(
                            "flex cursor-pointer items-center gap-3 rounded-md border-2 px-3 py-3 transition-colors",
                            checked ? "border-primary bg-primary/5" : "border-border hover:bg-accent",
                          )}
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(value) => toggleFamily(family.value, value === true)}
                          />
                          <span className="font-mono text-sm font-bold">{family.short}</span>
                          <span className="text-sm font-medium">{family.label}</span>
                        </label>
                      );
                    })}
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Saved against every divided part of the voices you pick, so a Soprano 1 singer
                    finds this song without anybody choosing a level.
                  </p>

                  {errors.voiceFamilies ? (
                    <p className="text-xs font-medium text-destructive">
                      {errors.voiceFamilies.message}
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className="space-y-2">
                  {parts.isLoading ? (
                    <Skeleton className="h-48 w-full" />
                  ) : (
                    (parts.data ?? []).map((part) => {
                      const checked = selectedParts.includes(part.id);
                      return (
                        <label
                          key={part.id}
                          className="flex cursor-pointer items-center gap-3 rounded-md border border-transparent px-2 py-2 hover:bg-accent"
                          style={checked ? { borderColor: `${part.color}55` } : undefined}
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(value) => togglePart(part.id, value === true)}
                          />
                          <span className="flex items-center gap-2 text-sm font-medium">
                            <span className="font-mono text-xs" style={{ color: part.color }}>
                              {part.short_code}
                            </span>
                            {part.name}
                          </span>
                          {!part.is_active ? (
                            <span className="ml-auto text-xs text-muted-foreground">inactive</span>
                          ) : null}
                        </label>
                      );
                    })
                  )}
                  {errors.voiceClassificationIds ? (
                    <p className="text-xs font-medium text-destructive">
                      {errors.voiceClassificationIds.message}
                    </p>
                  ) : null}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className={needsRights && !form.watch("rightsConfirmed") ? "border-destructive/50" : undefined}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-brass" aria-hidden /> Rights
              </CardTitle>
              <CardDescription>
                Embedded videos stay on YouTube. Lyrics are stored on our own server, which is the
                part that carries real risk — so they need an answer here first.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {needsRights ? null : (
                <p className="text-sm text-muted-foreground">
                  No lyrics on this song, so nothing is required. Filling it in anyway is still
                  useful for whoever looks after the library next.
                </p>
              )}

              <Field
                label="Basis"
                htmlFor="rights-basis"
                error={errors.rightsBasis?.message}
                required={needsRights}
              >
                <Select
                  value={rightsBasis ?? ""}
                  onValueChange={(value) =>
                    form.setValue("rightsBasis", value as SongFormValues["rightsBasis"], {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                >
                  <SelectTrigger id="rights-basis">
                    <SelectValue placeholder="How may we use this?" />
                  </SelectTrigger>
                  <SelectContent>
                    {RIGHTS_BASES.map((basis) => (
                      <SelectItem key={basis.value} value={basis.value}>
                        {basis.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              {rightsBasis ? (
                <p className="-mt-2 text-xs text-muted-foreground">
                  {RIGHTS_BASES.find((basis) => basis.value === rightsBasis)?.hint}
                </p>
              ) : null}

              <Field label="Rights holder" htmlFor="rights-holder" error={errors.rightsHolder?.message}>
                <Input
                  id="rights-holder"
                  placeholder="Publisher, estate, or the institution"
                  {...form.register("rightsHolder")}
                />
              </Field>

              <Field
                label="Note"
                htmlFor="rights-note"
                error={errors.rightsNote?.message}
                hint="Licence reference, who gave permission and when, or anything a successor would need."
              >
                <Textarea id="rights-note" rows={3} {...form.register("rightsNote")} />
              </Field>

              <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border p-3">
                <Checkbox
                  checked={form.watch("rightsConfirmed") ?? false}
                  onCheckedChange={(value) =>
                    form.setValue("rightsConfirmed", value === true, {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                />
                <span className="text-sm">
                  I confirm the institution may store and share this material with the ensemble.
                  {errors.rightsConfirmed ? (
                    <span className="mt-1 block text-xs font-medium text-destructive">
                      {errors.rightsConfirmed.message}
                    </span>
                  ) : null}
                </span>
              </label>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Thumbnail</CardTitle>
              <CardDescription>
                Optional. Without one, the card falls back to the video's own thumbnail.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ImageField
                id="song-thumbnail"
                bucket="song-thumbnails"
                value={thumbnailUrl || null}
                onChange={(value) => form.setValue("thumbnailUrl", value ?? "", { shouldDirty: true })}
              />
              {errors.thumbnailUrl ? (
                <p className="mt-2 text-xs font-medium text-destructive">{errors.thumbnailUrl.message}</p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
        <Button asChild variant="ghost" type="button">
          <Link to="/admin/songs">Cancel</Link>
        </Button>
        <Button type="submit" loading={save.isPending}>
          {isEdit ? "Save changes" : "Add song"}
        </Button>
      </div>
    </form>
  );
}
