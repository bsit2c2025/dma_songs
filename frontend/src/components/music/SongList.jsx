import SongCard from "./SongCard";
import EmptyState from "../common/EmptyState";

export default function SongList({ songs }) {
  if (!songs.length) {
    return (
      <EmptyState
        title="No songs yet"
        description="Once the admin publishes songs assigned to this voice part, they'll show up here."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {songs.map((song) => (
        <SongCard key={song.id} song={song} />
      ))}
    </div>
  );
}
