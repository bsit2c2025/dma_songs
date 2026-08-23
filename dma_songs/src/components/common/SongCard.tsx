import { Link } from "react-router-dom";
import { Music4, Video } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VoicePartChip } from "@/components/common/VoicePartChip";
import { thumbnailFromVideoId } from "@/lib/youtube";
import type { Song } from "@/types/models";

/**
 * Thumbnail order: an uploaded/stored image first, then the video for the
 * part the singer selected, then any video, then the house motif. Nothing
 * external is fetched for a song that has no video at all.
 */
function resolveThumbnail(song: Song, selectedPartId: string | null) {
  if (song.thumbnail_url) return song.thumbnail_url;
  const forPart = selectedPartId
    ? song.videos.find((v) => v.voice_classification_id === selectedPartId)
    : undefined;
  const fallback = forPart ?? song.videos[0];
  return fallback ? thumbnailFromVideoId(fallback.youtube_video_id) : null;
}

export function SongCard({ song, selectedPartId = null }: { song: Song; selectedPartId?: string | null }) {
  const thumbnail = resolveThumbnail(song, selectedPartId);
  const partVideo = selectedPartId
    ? song.videos.find((v) => v.voice_classification_id === selectedPartId)
    : undefined;
  const credits = [song.composer, song.arranger].filter(Boolean).join(" • ");

  return (
    <article className="group flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
      <div className="relative aspect-video overflow-hidden bg-primary/5">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="stave flex h-full w-full items-center justify-center" aria-hidden>
            <Music4 className="h-8 w-8 text-primary/40" />
          </div>
        )}
        {partVideo ? (
          <Badge className="absolute left-3 top-3 bg-card/95 text-foreground shadow-sm">
            <Video className="h-3 w-3" aria-hidden /> Part video
          </Badge>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="space-y-1">
          <h3 className="line-clamp-2 font-display text-lg leading-snug">
            <Link to={`/songs/${song.id}`} className="hover:text-primary focus-visible:text-primary">
              <span className="absolute inset-0 sr-only" />
              {song.title}
            </Link>
          </h3>
          {credits ? <p className="line-clamp-1 text-sm text-muted-foreground">{credits}</p> : null}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {song.category ? <Badge variant="secondary">{song.category}</Badge> : null}
          {song.voiceClassifications.slice(0, 4).map((part) => (
            <VoicePartChip key={part.id} part={part} />
          ))}
          {song.voiceClassifications.length > 4 ? (
            <span className="text-xs text-muted-foreground">
              +{song.voiceClassifications.length - 4}
            </span>
          ) : null}
        </div>

        <div className="mt-auto pt-1">
          <Button asChild size="sm" className="w-full sm:w-auto">
            <Link to={`/songs/${song.id}`}>Practice</Link>
          </Button>
        </div>
      </div>
    </article>
  );
}

export function SongCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="aspect-video animate-pulse bg-muted" />
      <div className="space-y-3 p-4">
        <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
        <div className="h-8 w-24 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}
