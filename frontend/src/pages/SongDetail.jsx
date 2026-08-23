import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getSong } from "../api/songs";
import Spinner from "../components/common/Spinner";
import ErrorMessage from "../components/common/ErrorMessage";
import Badge from "../components/common/Badge";
import SongList from "../components/music/SongList";

export default function SongDetail() {
  const { id } = useParams();
  const [song, setSong] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getSong(id)
      .then((data) => mounted && setSong(data))
      .catch((err) => mounted && setError(err.message))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [id]);

  if (loading) return <Spinner label="Loading song..." />;
  if (error) return <ErrorMessage message={error} />;
  if (!song) return null;

  const youtubeEmbed = toYoutubeEmbedUrl(song.youtube_url);
  const sheetUrl = song.music_sheet_file_url || song.music_sheet_url;

  return (
    <div className="flex flex-col gap-8">
      <Link to="/music" className="text-sm font-medium text-accent hover:underline">
        ← Back to music list
      </Link>

      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold text-primary">{song.title}</h1>
          {song.category && <Badge tone="accent">{song.category.name}</Badge>}
          {song.note_type && <Badge>{song.note_type}</Badge>}
        </div>
        {song.composer && <p className="mt-1 text-sm text-muted">{song.composer}</p>}
        {song.voice_parts?.length > 0 && (
          <p className="mt-2 text-xs text-muted">
            Assigned to: {song.voice_parts.map((v) => v.name).join(", ")}
          </p>
        )}
      </div>

      {song.description && <p className="text-sm text-primary/90">{song.description}</p>}
      {song.notes && (
        <div className="rounded-md bg-primary/5 px-4 py-3 text-sm text-primary">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Notes</p>
          {song.notes}
        </div>
      )}

      {youtubeEmbed && (
        <div className="aspect-video w-full overflow-hidden rounded-lg border border-primary/10">
          <iframe
            src={youtubeEmbed}
            title={`${song.title} — YouTube reference`}
            className="h-full w-full"
            allowFullScreen
          />
        </div>
      )}

      {sheetUrl && (
        <a
          href={sheetUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-fit items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
        >
          ♪ Open sheet music
        </a>
      )}

      {song.related_songs?.length > 0 && (
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-primary">More in {song.category?.name}</h2>
          <SongList songs={song.related_songs} />
        </div>
      )}
    </div>
  );
}

function toYoutubeEmbedUrl(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    let videoId = null;
    if (parsed.hostname.includes("youtu.be")) {
      videoId = parsed.pathname.slice(1);
    } else if (parsed.searchParams.get("v")) {
      videoId = parsed.searchParams.get("v");
    }
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  } catch {
    return null;
  }
}
