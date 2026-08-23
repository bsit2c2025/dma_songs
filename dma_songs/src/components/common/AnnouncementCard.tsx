import { CalendarClock, Pin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RichText } from "@/components/common/RichText";
import { formatDateTime } from "@/lib/utils";
import type { Announcement } from "@/types/models";
import { cn } from "@/lib/utils";

export function AnnouncementCard({
  announcement,
  className,
}: {
  announcement: Announcement;
  className?: string;
}) {
  const { title, content, image_url, link_url, link_label, is_pinned, ends_at } = announcement;

  return (
    <article
      className={cn(
        "overflow-hidden rounded-lg border bg-card shadow-sm",
        is_pinned ? "border-brass/50 ring-1 ring-brass/20" : "border-border",
        className,
      )}
    >
      {image_url ? (
        <img src={image_url} alt="" loading="lazy" className="h-44 w-full object-cover sm:h-56" />
      ) : null}
      <div className="space-y-3 p-5">
        <div className="flex flex-wrap items-center gap-2">
          {is_pinned ? (
            <Badge className="bg-brass text-brass-foreground">
              <Pin className="h-3 w-3" aria-hidden /> Pinned
            </Badge>
          ) : null}
          {ends_at ? (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <CalendarClock className="h-3.5 w-3.5" aria-hidden /> Until {formatDateTime(ends_at)}
            </span>
          ) : null}
        </div>

        <h3 className="font-display text-xl leading-snug">{title}</h3>
        <RichText html={content} />

        {link_url ? (
          <Button asChild variant="outline" size="sm">
            <a
              href={link_url}
              target={link_url.startsWith("/") ? undefined : "_blank"}
              rel="noopener noreferrer"
            >
              {link_label || "Open link"}
            </a>
          </Button>
        ) : null}
      </div>
    </article>
  );
}
