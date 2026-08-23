import * as React from "react";
import { Play } from "lucide-react";
import { embedUrl, thumbnailFromVideoId } from "@/lib/youtube";
import { cn } from "@/lib/utils";

interface YouTubeEmbedProps {
  videoId: string;
  title: string;
  className?: string;
}

/**
 * Click-to-play. The iframe is only mounted once the person asks for it, which
 * keeps YouTube's scripts (and cookies) off the page for anyone just browsing,
 * and keeps song pages with several parts light.
 */
export function YouTubeEmbed({ videoId, title, className }: YouTubeEmbedProps) {
  const [playing, setPlaying] = React.useState(false);

  return (
    <div className={cn("relative aspect-video w-full overflow-hidden rounded-lg bg-foreground/90", className)}>
      {playing ? (
        <iframe
          className="absolute inset-0 h-full w-full"
          src={embedUrl(videoId, { autoplay: true })}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          className="group absolute inset-0 flex h-full w-full items-center justify-center"
          aria-label={`Play ${title}`}
        >
          <img
            src={thumbnailFromVideoId(videoId)}
            alt=""
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover opacity-80 transition-opacity group-hover:opacity-95"
          />
          <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-card/95 shadow-lg transition-transform group-hover:scale-105">
            <Play className="ml-1 h-7 w-7 fill-primary text-primary" aria-hidden />
          </span>
        </button>
      )}
    </div>
  );
}
