import * as React from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, FileText, Info, Music4, NotebookPen, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { YouTubeEmbed } from "@/components/common/YouTubeEmbed";
import { VoicePartChip } from "@/components/common/VoicePartChip";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { useSong } from "@/hooks/useSongs";
import { useVoicePart } from "@/features/voice/VoicePartProvider";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

const GENERAL = "__general__";

export default function SongDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: song, isLoading, isError, error, refetch } = useSong(id);
  const { selectedId, parts } = useVoicePart();

  useDocumentTitle(song?.title, song?.description ?? undefined);

  /**
   * Open on the video for the singer's own part when there is one, so the
   * common case is zero clicks. Otherwise fall back to a general recording.
   */
  const initialTab = React.useMemo(() => {
    if (!song) return GENERAL;
    const own = song.videos.find((v) => v.voice_classification_id === selectedId);
    if (own) return own.id;
    const general = song.videos.find((v) => v.voice_classification_id === null);
    return general?.id ?? song.videos[0]?.id ?? GENERAL;
  }, [song, selectedId]);

  const [tab, setTab] = React.useState(initialTab);
  React.useEffect(() => setTab(initialTab), [initialTab]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="aspect-video w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (isError) return <ErrorState title="This song didn't load" error={error} onRetry={refetch} />;

  if (!song) {
    return (
      <EmptyState
        icon={<Music4 />}
        title="That song isn't available"
        description="It may have been removed, or it isn't published right now."
        action={
          <Button asChild>
            <Link to="/songs">Back to the library</Link>
          </Button>
        }
      />
    );
  }

  const credits = [
    song.composer ? { label: "Composer", value: song.composer } : null,
    song.arranger ? { label: "Arranger", value: song.arranger } : null,
    song.category ? { label: "Category", value: song.category } : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  const selectedPart = parts.find((p) => p.id === selectedId) ?? null;

  function labelFor(voiceClassificationId: string | null, fallback: string | null) {
    if (!voiceClassificationId) return fallback || "Full ensemble";
    const part = parts.find((p) => p.id === voiceClassificationId);
    return fallback || part?.name || "Part video";
  }

  return (
    <div className="space-y-8">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-3">
          <Link to="/songs">
            <ArrowLeft aria-hidden /> Back to the library
          </Link>
        </Button>

        <div className="flex flex-wrap items-center gap-2">
          {selectedPart ? (
            <span className="text-xs text-muted-foreground">You're practising</span>
          ) : null}
          {selectedPart ? <VoicePartChip part={selectedPart} size="md" /> : null}
        </div>

        <h1 className="mt-2 text-3xl leading-tight sm:text-4xl">{song.title}</h1>

        {credits.length ? (
          <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
            {credits.map((credit) => (
              <div key={credit.label} className="flex gap-2">
                <dt className="text-muted-foreground">{credit.label}</dt>
                <dd className="font-medium">{credit.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        {song.description ? (
          <p className="mt-4 max-w-3xl text-muted-foreground">{song.description}</p>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-1.5">
          {song.voiceClassifications.map((part) => (
            <VoicePartChip key={part.id} part={part} />
          ))}
        </div>
      </div>

      <section aria-labelledby="video-heading">
        <h2 id="video-heading" className="sr-only">
          Practice videos
        </h2>

        {song.videos.length === 0 ? (
          <EmptyState
            icon={<Video />}
            title="No practice video yet"
            description="The lyrics and rehearsal notes below are still available."
          />
        ) : song.videos.length === 1 ? (
          <YouTubeEmbed
            videoId={song.videos[0]!.youtube_video_id}
            title={`${song.title} — ${labelFor(song.videos[0]!.voice_classification_id, song.videos[0]!.label)}`}
          />
        ) : (
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="h-auto flex-wrap">
              {song.videos.map((video) => {
                const part = parts.find((p) => p.id === video.voice_classification_id);
                return (
                  <TabsTrigger key={video.id} value={video.id}>
                    {part ? (
                      <span className="font-mono text-[0.7rem] tracking-wider" style={{ color: part.color }}>
                        {part.short_code}
                      </span>
                    ) : null}
                    {labelFor(video.voice_classification_id, video.label)}
                  </TabsTrigger>
                );
              })}
            </TabsList>
            {song.videos.map((video) => (
              <TabsContent key={video.id} value={video.id}>
                <YouTubeEmbed
                  videoId={video.youtube_video_id}
                  title={`${song.title} — ${labelFor(video.voice_classification_id, video.label)}`}
                />
              </TabsContent>
            ))}
          </Tabs>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-brass" aria-hidden /> Lyrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            {song.lyrics ? (
              <pre className="whitespace-pre-wrap font-sans text-[15px] leading-relaxed text-foreground/90">
                {song.lyrics}
              </pre>
            ) : (
              <p className="text-sm text-muted-foreground">No lyrics have been added for this song yet.</p>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <NotebookPen className="h-5 w-5 text-brass" aria-hidden /> Rehearsal notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {song.notes ? (
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{song.notes}</p>
              ) : (
                <p className="text-sm text-muted-foreground">No notes for this song.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5 text-brass" aria-hidden /> Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Parts</span>
                <span className="text-right font-medium">{song.voiceClassifications.length}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Practice videos</span>
                <span className="text-right font-medium">{song.videos.length}</span>
              </div>
              {song.category ? (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Category</span>
                  <Badge variant="secondary">{song.category}</Badge>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
