import { Link } from "react-router-dom";
import Badge from "../common/Badge";

export default function SongCard({ song }) {
  return (
    <Link
      to={`/music/${song.id}`}
      className="flex flex-col gap-2 rounded-lg border border-primary/10 bg-white p-4 transition hover:border-accent hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-primary">{song.title}</h3>
        {song.category && <Badge tone="accent">{song.category.name}</Badge>}
      </div>
      {song.composer && <p className="text-xs text-muted">{song.composer}</p>}
      <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted">
        {song.note_type && <Badge>{song.note_type}</Badge>}
        {song.youtube_url && <span>▶ YouTube reference</span>}
        {(song.music_sheet_url || song.music_sheet_file_url) && <span>♪ Sheet music</span>}
      </div>
    </Link>
  );
}
